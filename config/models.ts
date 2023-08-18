export const types = ["GPT-3", "GPT-4"] as const

export type ModelType = (typeof types)[number]

export interface Model<Type = string> {
  id: string
  name: string
  description: string
  strengths?: string
  type: Type
}

export const models: Model<ModelType>[] = [
  {
    id: "id-1",
    name: "gpt-4",
    description:
      "",
    type: "GPT-4",
    strengths:
      "",
  },
  {
    id: "id-2",
    name: "gpt-3.5-turbo-16k",
    description: "",
    type: "GPT-3",
    strengths:
      "",
  },
  
]
