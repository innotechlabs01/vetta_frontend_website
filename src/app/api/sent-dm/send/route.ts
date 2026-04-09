// src/app/api/sent-dm/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import SentDm from "@sentdm/sentdm";

interface SendMessageRequest {
  to: string[];
  template: {
    id: string;
    name?: string;
    parameters?: Record<string, any>;
  };
  channel?: "sms" | "whatsapp" | "auto";
  metadata?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const orgId = cookieStore.get("org_id")?.value;

    if (!orgId) {
      return NextResponse.json(
        { error: "No organization selected" },
        { status: 400 }
      );
    }

    const body: SendMessageRequest = await request.json();

    if (!body.to || !body.template) {
      return NextResponse.json(
        { error: "Missing required fields: to, template" },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.SENT_DM_API_KEY || process.env.NEXT_PUBLIC_SENT_DM_SANDBOX_KEY;
    
    if (!apiKey) {
      console.error("[sent-dm-send] No API key configured");
      return NextResponse.json(
        { error: "Sent.dm not configured" },
        { status: 500 }
      );
    }

    // Initialize Sent.dm client
    const client = new SentDm({ apiKey });

    // Determine channel
    const channel = body.channel || "sms";

    // Send message using SDK
    const response = await client.messages.send({
      to: body.to,
      template: {
        id: body.template.id,
        name: body.template.name,
        parameters: body.template.parameters
      },
      channel: [channel] as ("sms" | "whatsapp" | "auto")[]
    }) as any;

    const message = response.data?.messages?.[0];

    return NextResponse.json({
      success: true,
      data: {
        id: message?.id,
        status: message?.status,
        channel: message?.channel,
        created_at: message?.created_at,
      },
      meta: {
        request_id: response.data?.request_id,
        timestamp: response.data?.timestamp,
      },
    });
  } catch (error: any) {
    console.error("[sent-dm-send] Error:", error);
    
    // Handle Sent.dm API errors
    if (error instanceof SentDm.APIError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.name,
            message: error.message,
          },
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}