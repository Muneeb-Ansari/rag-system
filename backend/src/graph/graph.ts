import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ragNode } from "./nodes/rag.js";
import { answerNode } from "./nodes/answer.js";
import { ChatOpenAI } from "@langchain/openai";

const GraphState = Annotation.Root({
  question: Annotation<string>(),
  context: Annotation<string | undefined>(),
  answer: Annotation<string | undefined>(),
  chat: Annotation<string | undefined>(),
});


const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const routerNode = async (state: any) => {
  const question = state.question;

   const response = await model.invoke([
    {
      role: "system",
      content: `
You are an intent classifier.

Return ONLY one word:

chat
rag
business

Rules:

chat:
- greetings
- casual talk
- who are you
- thanks
- bye
- personal AI questions

business:
- shop location
- office address
- timings
- contact info
- services
- pricing
- business related questions

rag:
- factual questions
- documentation
- uploaded files
- technical explanations
- knowledge retrieval
`,
    },
    {
      role: "user",
      content: state.question,
    },
  ]);

  const intent = response.content.toString().trim();

  if (intent === "chat") {
    return "chatNode";
  }

  return "rag";
};

const chatNode = async (state: any) => {
  const response = await model.invoke([
    {
      role: "system",
      content:
        "You are a friendly AI assistant. Reply casually and shortly.",
    },
    {
      role: "user",
      content: state.question,
    },
  ]);

  return {
    answer: response.content,
  };
};

const workflow = new StateGraph(GraphState)
  .addNode("rag", ragNode)
  .addNode("generateAnswer", answerNode)
  .addNode("chatNode", chatNode)
  // .addEdge(START, "rag")
  .addConditionalEdges(START, routerNode, {
    chatNode: "chatNode",
    rag: "rag",
  })
  .addEdge("rag", "generateAnswer")
  .addEdge("generateAnswer", END)
  .addEdge("chatNode", END);

export const ragGraph = workflow.compile();