"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import EditorJS from "@editorjs/editorjs"
import { zodResolver } from "@hookform/resolvers/zod"
import { Post } from "@/types/main"
import { useForm } from "react-hook-form"
import TextareaAutosize from "react-textarea-autosize"
import * as z from "zod"

import "@/styles/editor.css"
import { cn } from "@/lib/utils"
import { postPatchSchema } from "@/lib/validations/post"
import { Button, buttonVariants } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"
import { ScrollArea } from "@radix-ui/react-scroll-area"
import { Textarea } from "./ui/textarea"
import { Input } from "./ui/input"
import { ModelSelector } from "./model-selector"
import { Model, models, types } from "@/config/models"
import { TemperatureSelector } from "./temperature-selector"
import { MaxLengthSelector } from "./maxlength-selector"
import { TopPSelector } from "./top-p-selector"

interface EditorProps {
  post: Pick<Post, "id" | "title" | "content" | "published">
}

type FormData = z.infer<typeof postPatchSchema>

type Prompt = {
  previousResponse: string;
  systemNotes: string;
  user: string;
  response: string;
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  model: Model;
  max_tokens: number;
};

function parsePostContent(post) {
  try {
    return postPatchSchema.parse(post).content || [];
  } catch (error) {
    console.error("Error parsing post content:", error);
    return [];
  }
}

export function Editor({ post }: EditorProps) {
  const [initialLoading, setInitalLoading] = React.useState(true);
  const [prompts, setPrompts] = React.useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = React.useState<number | null>(null);
  const [loadingPrompt, setLoadingPrompt] = React.useState<number | null>(null);
  const [apiKey, setApiKey] = React.useState<string>();

  React.useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const postParsed = await postPatchSchema.parse(post).content;
        if (postParsed === null) return;
        console.log("POST", postParsed);
        setPrompts(postParsed);
        setInitalLoading(false)
      } catch (error) {
        console.error("Error fetching prompts:", error);
      }
    };

    fetchPrompts();
  }, [post]);

  const addPrompt = () => {
    const newPrompt: Prompt = {
      temperature: 0.7,
      previousResponse: '',
      systemNotes: '',
      user: '',
      response: '',
      top_p: 0.9,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      model: models[0],
      max_tokens: 100,
    };

    setPrompts([...prompts, newPrompt]);
  };

  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(postPatchSchema),
  })
  const ref = React.useRef<EditorJS>()
  const router = useRouter()
  const [isSaving, setIsSaving] = React.useState<boolean>(false)
  // const [isMounted, setIsMounted] = React.useState<boolean>(false)

  React.useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const targetElement = event.target as HTMLElement;

      // Check if the clicked element is not within a prompt item
      const isClickOutsidePrompt = !targetElement.closest(".prompt-item");

      if (isClickOutsidePrompt) {
        setSelectedPrompt(null);
      }
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  // const initializeEditor = React.useCallback(async () => {
  //   const EditorJS = (await import("@editorjs/editorjs")).default
  //   const Header = (await import("@editorjs/header")).default
  //   const Embed = (await import("@editorjs/embed")).default
  //   const Table = (await import("@editorjs/table")).default
  //   const List = (await import("@editorjs/list")).default
  //   const Code = (await import("@editorjs/code")).default
  //   const LinkTool = (await import("@editorjs/link")).default
  //   const InlineCode = (await import("@editorjs/inline-code")).default

  //   const body = postPatchSchema.parse(post)

  //   if (!ref.current) {
  //     const editor = new EditorJS({
  //       holder: "editor",
  //       onReady() {
  //         ref.current = editor
  //       },
  //       placeholder: "Type here to write your post...",
  //       inlineToolbar: true,
  //       data: body.content,
  //       tools: {
  //         header: Header,
  //         linkTool: LinkTool,
  //         list: List,
  //         code: Code,
  //         inlineCode: InlineCode,
  //         table: Table,
  //         embed: Embed,
  //       },
  //     })
  //   }
  // }, [post])

  // React.useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     setIsMounted(true)
  //   }
  // }, [])

  // React.useEffect(() => {
  //   if (isMounted) {
  //     initializeEditor()

  //     return () => {
  //       ref.current?.destroy()
  //       ref.current = undefined
  //     }
  //   }
  // }, [isMounted, initializeEditor])

  async function onSubmit(data: FormData) {
    setIsSaving(true)

    const blocks = await ref.current?.save()

    const response = await fetch(`/api/chains/${post.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: data.title,
        content: prompts,
      }),
    })

    setIsSaving(false)

    if (!response?.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Your post was not saved. Please try again.",
        variant: "destructive",
      })
    }

    router.refresh()

    return toast({
      description: "Your post has been saved.",
    })
  }

  const handlePromptClick = (index: number) => {
    console.log("HANDLE PROMPT CLICK")
    setSelectedPrompt(index);
  };

  const handleDeletePrompt = (index: number) => {
    const updatedPrompts = prompts.filter((_, i) => i !== index);
    setPrompts(updatedPrompts);
    console.log("SET TO NULL", selectedPrompt, index)

    if (selectedPrompt === index) {
      console.log("SET TO NULL")
      setSelectedPrompt(null);
    }
  };

  const handleUpdatePrompt = (index: number, key: string, value: any) => {
    // Update the prompt at the specified index with the new key-value pair
    const updatedPrompts = prompts.map((prompt, i) =>
      i === index ? { ...prompt, [key]: value } : prompt
    );

    console.log("UPDATED PROMPT", updatedPrompts)

    // Update the prompts state with the new array
    setPrompts(updatedPrompts);
  };

  function replaceResponsePlaceholders(inputString) {
    const responsePlaceholderRegex = /\[RESPONSE (\d+)\]/g;

    const updatedString = inputString.replace(responsePlaceholderRegex, (_, number) => {
      const promptIndex = Number(number) - 1;
      if (promptIndex >= 0 && promptIndex < prompts.length) {
        return prompts[promptIndex].response;
      } else {
        return `[RESPONSE ${number}]`;
      }
    });

    return updatedString;
  }

  function updateResponseNumbers(newLength: number, prompts: Prompt[]): Prompt[] {
    const updatedPrompts = prompts.map((prompt, index) => {
      const responseRegex = /\[RESPONSE (\d+)\]/g;
      const userValue = prompt.user;
      const updatedUserValue = userValue.replace(
        responseRegex,
        (_, match) => `[RESPONSE ${Number(match)}]`
      );
      return { ...prompt, user: updatedUserValue };
    });

    return updatedPrompts;
  }

  React.useEffect(() => {
    const updatedPrompts = updateResponseNumbers(prompts.length, prompts);
    setPrompts(updatedPrompts);
  }, [prompts.length]);

  async function generate(index: number, run: boolean) {
    try {

      console.log("GENERATE CLICKED")

      if (!apiKey) {
        return toast({
          title: "Something went wrong.",
          description: `You must include a working OpenAi API key.`,
          variant: "destructive",
        });
      }
      setLoadingPrompt(index)

    //   setPrompts((prevPrompts) =>
    //   prevPrompts.map((prompt, i) => ({
    //     ...prompt,
    //     response: i >= index ? "" : prompt.response,
    //   }))
    // );

      const response = await fetch(`/api/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...prompts[index], apiKey, model: prompts[index]?.model?.name, user: replaceResponsePlaceholders(prompts[index].user)}),
      });

      console.log("USER", index, replaceResponsePlaceholders(prompts[index].user))

      if (!response.ok) {
        return toast({
          title: "Something went wrong.",
          description: `Prompt ${index + 1} generation failed. Please try again.`,
          variant: "destructive",
        });
      }

      // This data is a ReadableStream
      const data = response.body;

      if (!data) return;

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let responseValue = ""; // Get the existing response value

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        responseValue += chunkValue; // Add the new chunkValue to the existing response value
        setPrompts((prevPrompts) => {
            const newPrompts = [...prevPrompts];
            newPrompts[index] = {
                ...newPrompts[index],
                response: responseValue,
            };
            return newPrompts;
        });

      }
      setLoadingPrompt(null)

      if (done && prompts.length > index + 1 && run) {
        generate(index + 1, run)
      }

    } catch (error) {
      console.error(error);
      toast({
        title: "Something went wrong.",
        description: `Prompt ${index + 1} generation failed. Please try again.`,
        variant: "destructive",
      });
    }
  }

  if (initialLoading) return <div></div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="h-full max-h-screen">
      <div className="fixed left-0 z-10 flex h-14 w-full items-center justify-between border-b bg-background px-4">
        <div className="flex items-center space-x-10">
          <div className="text-lg">🍝</div>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            <>
              <Icons.chevronLeft className="mr-2 h-4 w-4" />
              Back
            </>
          </Link>
          <p className="text-sm text-muted-foreground">
            {post.published ? "Published" : "Draft"}
          </p>
        </div>
        <Input className="h-8 w-40 border" placeholder="OPEN AI API CODE" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
        <div>  <button type="button" className={cn(buttonVariants())} onClick={() => generate(0, true)}>
          {loadingPrompt !== null && (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          )}
          <span>Run</span>
        </button>  <button type="submit" className={cn(buttonVariants())}>
          {isSaving && (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          )}
          <span>Save</span>
        </button></div>
      
      </div>
      <div className="flex h-full max-h-screen w-full justify-center">
        <div className="w-full" />
        {/* <div className="prose prose-stone mx-auto w-[800px] dark:prose-invert"> */}
        <ScrollArea className="overflow-y mt-14 flex min-w-[700px] flex-col items-center space-y-1 border-x px-12">
          {prompts.map((_, i) => (
            <div className="flex w-full flex-col items-center">

              <div
                key={i}
                className={`flex h-80 w-full flex-col items-center space-y-2 rounded-xl border p-2 ${selectedPrompt === i ? "border-2 border-primary" : ""
                  } prompt-item`}
                onClick={() => {
                  if (i === loadingPrompt) return
                  handlePromptClick(i)
                }}
              >
                <div className="flex w-full justify-between"><div className="text-xs">Response #{i + 1}</div><Button
                  variant="destructive"
                  type="button"
                  className="delete-item h-7 w-20 text-xs"
                  onClick={(e) => {
                    // Prevent the click event from propagating to the parent element
                    e.stopPropagation();
                    handleDeletePrompt(i);
                  }}
                >Delete</Button></div>
                <p className="flex w-full space-x-3 rounded-md text-sm text-muted-foreground">
                  <div className="border-orange h-7 w-20 rounded border bg-transparent px-2 py-1 text-center text-xs text-primary">System</div>
                  <Textarea className="h-14" value={prompts[i]?.systemNotes || ""}
                    onChange={(event) => handleUpdatePrompt(i, "systemNotes", event.target.value)
                    }
                  />
                </p>
                <p className="flex w-full space-x-3 rounded-md text-sm text-muted-foreground">
                  <div className="border-orange h-7 w-20 rounded border bg-transparent px-2 py-1 text-center text-xs text-primary">User</div>
                  <Textarea className="h-14" value={prompts[i]?.user || (i > 0 ? `[RESPONSE ${i}]` : "")}
                    onChange={(event) => handleUpdatePrompt(i, "user", event.target.value)
                    }
                  />
                </p>
                <p className="flex w-full space-x-3 rounded-md text-sm text-muted-foreground">
                  <div className="border-orange h-7 w-20 rounded border bg-transparent px-2 py-1 text-center text-xs text-primary ">Response</div>
                  <Textarea className="no-outline h-14" value={prompts[i]?.response || ""}
                    readOnly
                    onSelect={(e) => e.preventDefault()} // Prevent text selection

                  />
                </p>
                <Button type="button" className="w-30 h-7 text-xs" onClick={() => generate(i, false)}>Generate{i === loadingPrompt && <Icons.spinner className="h-4 w-4 animate-spin" />}</Button>

              </div>
              <Icons.arrowDown className="my-3 h-4 w-4 fill-primary" />
            </div>

          ))}
          <Button type="button" className="w-40" onClick={addPrompt}>Add Prompt <Icons.plus className="ml-1 h-4 w-4" /></Button>
        </ScrollArea>
        <div className="relative flex w-full justify-center">
          {selectedPrompt !== null && <div className="prompt-item fixed top-20 mt-14 h-72 w-60 rounded-lg border p-4">
            <ModelSelector types={types} models={models} selectedModel={prompts[selectedPrompt]?.model} setSelectedModel={(model) => handleUpdatePrompt(selectedPrompt, "model", model)} />
            <TemperatureSelector value={[prompts[selectedPrompt]?.temperature]} setValue={(value) => {
              const v = value[0]

              console.log("VALUE", v, prompts[selectedPrompt])

              handleUpdatePrompt(selectedPrompt, "temperature", v)
            }
            } />
            <MaxLengthSelector value={[prompts[selectedPrompt]?.max_tokens]} setValue={(value) => {
              const v = value[0]

              console.log("VALUE", v, prompts[selectedPrompt])

              handleUpdatePrompt(selectedPrompt, "max_tokens", v)
            }
            } />
            <TopPSelector value={[prompts[selectedPrompt]?.top_p]} setValue={(value) => {
              const v = value[0]

              console.log("VALUE", v, prompts[selectedPrompt])

              handleUpdatePrompt(selectedPrompt, "top_p", v)
            }
            } />
          </div>}
        </div>

        {/* <TextareaAutosize
            autoFocus
            id="title"
            defaultValue={post.title}
            placeholder="Post title"
            className="w-full resize-none appearance-none overflow-hidden bg-transparent text-5xl font-bold focus:outline-none"
            {...register("title")}
          /> */}
        {/* <div id="editor" className="min-h-[500px]" /> */}
        {/* <p className="text-sm text-gray-500">
            Use{" "}
            <kbd className="rounded-md border bg-muted px-1 text-xs uppercase">
              Tab
            </kbd>{" "}
            to open the command menu.
          </p> */}
        {/* </div> */}
      </div>

    </form>
  )
}
