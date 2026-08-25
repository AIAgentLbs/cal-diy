#!/usr/bin/env python3

import argparse
from collections import Counter
import json
import os
from pathlib import Path
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


API_URL = "https://api.namecheap.com/xml.response"
HOST_FIELDS = ("Name", "Type", "Address", "MXPref", "TTL")
SET_HOST_FIELD_NAMES = {
    "Name": "HostName",
    "Type": "RecordType",
    "Address": "Address",
    "MXPref": "MXPref",
    "TTL": "TTL",
}


def call_api(parameters: dict[str, str]) -> bytes:
    request = urllib.request.Request(
        API_URL,
        data=urllib.parse.urlencode(parameters).encode(),
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def parse_response(payload: bytes) -> ET.Element:
    root = ET.fromstring(payload)
    if root.attrib.get("Status") == "OK":
        return root
    errors = [element.text or "Unknown API error" for element in root.iter() if element.tag.endswith("Error")]
    raise RuntimeError("; ".join(errors) or "Namecheap API returned an error")


def parse_hosts(root: ET.Element) -> list[dict[str, str]]:
    return [
        {field: element.attrib.get(field, "") for field in HOST_FIELDS}
        for element in root.iter()
        if element.tag.endswith("host")
    ]


def host_fingerprint(host: dict[str, str]) -> tuple[str, ...]:
    return tuple(host[field] for field in HOST_FIELDS)


def build_set_parameters(
    common: dict[str, str], hosts: list[dict[str, str]]
) -> dict[str, str]:
    parameters = {**common, "Command": "namecheap.domains.dns.setHosts"}
    for index, host in enumerate(hosts, start=1):
        for field in HOST_FIELDS:
            parameters[f"{SET_HOST_FIELD_NAMES[field]}{index}"] = host[field]
    return parameters


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-user", required=True)
    parser.add_argument("--client-ip", required=True)
    parser.add_argument("--sld", required=True)
    parser.add_argument("--tld", required=True)
    parser.add_argument("--host", required=True)
    parser.add_argument("--address", required=True)
    parser.add_argument("--ttl", default="300")
    parser.add_argument("--backup", type=Path, required=True)
    parser.add_argument("--restore-from", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    api_key = sys.stdin.readline().strip()
    if not api_key:
        raise RuntimeError("Namecheap API key must be provided on stdin")

    common = {
        "ApiUser": args.api_user,
        "ApiKey": api_key,
        "UserName": args.api_user,
        "ClientIp": args.client_ip,
        "SLD": args.sld,
        "TLD": args.tld,
    }
    current_payload = call_api({**common, "Command": "namecheap.domains.dns.getHosts"})
    current_root = parse_response(current_payload)
    current_hosts = parse_hosts(current_root)

    args.backup.parent.mkdir(parents=True, exist_ok=True)
    args.backup.write_bytes(current_payload)
    os.chmod(args.backup, 0o600)

    base_hosts = current_hosts
    if args.restore_from:
        base_hosts = parse_hosts(parse_response(args.restore_from.read_bytes()))
        if not base_hosts:
            raise RuntimeError("The restore snapshot does not contain DNS records")
    elif not current_hosts:
        raise RuntimeError("The current DNS zone is empty; an explicit --restore-from snapshot is required")

    desired = dict(zip(HOST_FIELDS, (args.host, "A", args.address, "10", args.ttl), strict=True))
    target_indexes = [
        index
        for index, host in enumerate(base_hosts)
        if host["Name"].lower() == args.host.lower() and host["Type"] == "A"
    ]
    if target_indexes:
        updated_hosts = list(base_hosts)
        updated_hosts[target_indexes[0]] = desired
    else:
        updated_hosts = [*base_hosts, desired]

    if Counter(map(host_fingerprint, current_hosts)) == Counter(map(host_fingerprint, updated_hosts)):
        print(json.dumps({"changed": False, "host_count": len(current_hosts), "backup": str(args.backup)}))
        return 0

    if not args.apply:
        print(
            json.dumps(
                {
                    "changed": False,
                    "dry_run": True,
                    "host_count_before": len(current_hosts),
                    "host_count_after": len(updated_hosts),
                    "backup": str(args.backup),
                }
            )
        )
        return 0

    set_parameters = build_set_parameters(common, updated_hosts)
    set_root = parse_response(call_api(set_parameters))
    result = next((element for element in set_root.iter() if element.tag.endswith("DomainDNSSetHostsResult")), None)
    if result is None or result.attrib.get("IsSuccess", "false").lower() != "true":
        raise RuntimeError("Namecheap did not confirm the DNS update")

    verified_payload = call_api({**common, "Command": "namecheap.domains.dns.getHosts"})
    verified_hosts = parse_hosts(parse_response(verified_payload))
    if Counter(map(host_fingerprint, verified_hosts)) != Counter(map(host_fingerprint, updated_hosts)):
        raise RuntimeError("DNS verification differs from the requested complete record set")

    print(
        json.dumps(
            {
                "changed": True,
                "host_count_before": len(current_hosts),
                "host_count_after": len(verified_hosts),
                "target": f"{args.host}.{args.sld}.{args.tld}",
                "address": args.address,
                "backup": str(args.backup),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
