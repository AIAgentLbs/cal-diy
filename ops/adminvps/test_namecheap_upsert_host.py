import importlib.util
from pathlib import Path
import unittest


MODULE_PATH = Path(__file__).with_name("namecheap-upsert-host.py")
SPEC = importlib.util.spec_from_file_location("namecheap_upsert_host", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class BuildSetParametersTest(unittest.TestCase):
    def test_uses_namecheap_set_hosts_field_names(self) -> None:
        parameters = MODULE.build_set_parameters(
            {"ApiUser": "operator", "SLD": "example", "TLD": "pro"},
            [
                {
                    "Name": "cal",
                    "Type": "A",
                    "Address": "192.0.2.10",
                    "MXPref": "10",
                    "TTL": "300",
                }
            ],
        )

        self.assertEqual(parameters["HostName1"], "cal")
        self.assertEqual(parameters["RecordType1"], "A")
        self.assertEqual(parameters["Address1"], "192.0.2.10")
        self.assertEqual(parameters["MXPref1"], "10")
        self.assertEqual(parameters["TTL1"], "300")
        self.assertNotIn("Name1", parameters)
        self.assertNotIn("Type1", parameters)


if __name__ == "__main__":
    unittest.main()
