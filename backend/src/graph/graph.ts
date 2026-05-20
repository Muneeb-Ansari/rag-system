import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ragNode } from "./nodes/rag.js";
import { answerNode } from "./nodes/answer.js";

const GraphState = Annotation.Root({
  question: Annotation<string>(),
  context: Annotation<string | undefined>(),
  answer: Annotation<string | undefined>(),
});

const workflow = new StateGraph(GraphState)
  .addNode("rag", ragNode)
  .addNode("generateAnswer", answerNode)
  .addEdge(START, "rag")
  .addEdge("rag", "generateAnswer")
  .addEdge("generateAnswer", END);

export const ragGraph = workflow.compile();