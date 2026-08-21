import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { isEventPayload, type WebhookPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { TraceContext } from "@calcom/lib/tracing";
import { distributedTracing } from "@calcom/lib/tracing/factory";

async function _handleWebhookTrigger(args: {
  subscriberOptions: GetSubscriberOptions;
  eventTrigger: string;
  webhookData: WebhookPayloadType;
  isDryRun?: boolean;
  traceContext: TraceContext;
}) {
  const spanContext = distributedTracing.createSpan(args.traceContext, "webhook_trigger", {
    eventTrigger: args.eventTrigger || "unknown",
  });

  const tracingLogger = distributedTracing.getTracingLogger(spanContext);
  try {
    if (args.isDryRun) return;

    const subscribers = await getWebhooks(args.subscriberOptions);

    const promises = subscribers.map((sub) =>
      sendPayload(sub.secret, args.eventTrigger, new Date().toISOString(), sub, args.webhookData).catch(
        () => {
          if (isEventPayload(args.webhookData)) {
            tracingLogger.error(`Error executing webhook for event: ${args.eventTrigger}`, {
              webhookId: sub.id,
              bookingId: args.webhookData.bookingId,
              bookingUid: args.webhookData.uid,
            });
          }
        }
      )
    );
    await Promise.all(promises);
  } catch {
    tracingLogger.error("Error while sending webhook");
  }
}

export const handleWebhookTrigger = withReporting(_handleWebhookTrigger, "handleWebhookTrigger");
