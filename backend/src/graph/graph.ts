import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { decideNode } from "./nodes/decide.js";
import { ragNode } from "./nodes/rag.js";
import { answerNode } from "./nodes/answer.js";

const GraphState = Annotation.Root({
  question: Annotation<string>(),
  context: Annotation<string | undefined>(),
  answer: Annotation<string | undefined>(),
  route: Annotation<"rag" | "llm" | undefined>(),
});

const workflow = new StateGraph(GraphState)
  .addNode("decide", decideNode)
  .addNode("rag", ragNode)
  .addNode("generateAnswer", answerNode)
  .addEdge(START, "decide")
  .addConditionalEdges("decide", (state) => state.route ?? "llm", {
    rag: "rag",
    llm: "generateAnswer",
  })
  .addEdge("rag", "generateAnswer")
  .addEdge("generateAnswer", END);

export const ragGraph = workflow.compile();
