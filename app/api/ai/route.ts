import { cookies } from "next/headers"
import { createRouteHandlerClient  } from "@supabase/auth-helpers-nextjs"
import * as z from "zod"

import { Database } from "@/types/db"
// import { RequiresProPlanError } from "@/lib/exceptions"
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge';

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge'

const promptSchema = z.object({
    apiKey: z.string(),
    previousResponse: z.string(),
    systemNotes: z.string().optional(),
    user: z.string(),
    response: z.string(),
    temperature: z.number(),
    top_p: z.number(),
    frequency_penalty: z.number(),
    presence_penalty: z.number(),
    model: z.string(), // Replace with the actual enum type for Model
    max_tokens: z.number(),
  });

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient <Database>({
    cookies,
  })
  try {

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return new Response("Unauthorized", { status: 403 })
    }
  
      const json = await req.json()
      console.log("AI API", json)

      const {apiKey, user, systemNotes, model, max_tokens, temperature, top_p, frequency_penalty, presence_penalty} = promptSchema.parse(json)
  
      const configuration = new Configuration({
        apiKey,
      });
  
      const openai = new OpenAIApi(configuration);
      // console.log("messages", body.section, messages)
      const response = await openai.createChatCompletion({
        model,
        stream: true,
        max_tokens,
        messages: [{role: "system", content: systemNotes}, {role: "user", content: user}],
        temperature, 
        top_p, 
        frequency_penalty, 
        presence_penalty,
      })
  
      const stream = OpenAIStream(response)
  
      // return stream response (SSE)
      return new StreamingTextResponse(stream);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }

    // if (error instanceof RequiresProPlanError) {
    //   return new Response("Requires Pro Plan", { status: 402 })
    // }

    return new Response(null, { status: 500 })
  }
}
