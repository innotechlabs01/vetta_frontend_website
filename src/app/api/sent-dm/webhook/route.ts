// src/app/api/sent-dm/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";

/**
 * Sent.dm Webhook Handler
 * 
 * This endpoint receives webhook events from Sent.dm for message status updates.
 * It processes events like message sent, delivered, failed, etc.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headersList = await headers();
    
    // Verify webhook signature (if provided)
    const signature = headersList.get("x-sent-signature");
    if (signature) {
      const isValid = verifyWebhookSignature(signature, body);
      if (!isValid) {
        console.error("[sent-dm-webhook] Invalid signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Process the webhook event
    const { field, id, status, channel, to, metadata } = body;

    console.log("[sent-dm-webhook] Received event:", {
      field,
      id,
      status,
      channel,
      to,
      metadata,
    });

    // Handle message events
    if (field === "messages") {
      const tenantId = metadata?.tenantId;
      
      if (status === "SENT") {
        // Message was sent successfully
        console.log(`[sent-dm-webhook] Message ${id} sent to ${to}`);
        
        // TODO: Update your database with message status
        // await updateMessageStatus(id, { status: 'sent', sentAt: new Date() });
        
        // Track analytics per tenant if applicable
        if (tenantId) {
          console.log(`[sent-dm-webhook] Tracking sent message for tenant: ${tenantId}`);
          // await trackTenantUsage(tenantId, 'messages_sent', 1);
        }
      }
      
      if (status === "DELIVERED") {
        // Message was delivered
        console.log(`[sent-dm-webhook] Message ${id} delivered to ${to}`);
        // TODO: Update your database
      }
      
      if (status === "FAILED") {
        // Message failed to send
        console.log(`[sent-dm-webhook] Message ${id} failed: ${body.error || 'Unknown error'}`);
        // TODO: Update your database with failure reason
      }
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({
      received: true,
      event_id: id,
    });
  } catch (error) {
    console.error("[sent-dm-webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Verify the webhook signature from Sent.dm
 */
function verifyWebhookSignature(signature: string, body: any): boolean {
  const webhookSecret = process.env.SENT_DM_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn("[sent-dm-webhook] No webhook secret configured, skipping signature verification");
    return true; // In development, allow all requests
  }
  
  // The actual verification depends on Sent.dm's signature method
  // This is a placeholder - check Sent.dm documentation for the exact method
  const payload = JSON.stringify(body);
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");
  
  return signature === expectedSignature;
}

/**
 * Handle GET requests (for webhook verification)
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Sent.dm webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}