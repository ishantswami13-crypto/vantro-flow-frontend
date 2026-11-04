// Ready questions for Ask Starlane, shown in the Vault and on Prompts and workflows.
export type Prompt = { text: string; area: string };
export const PROMPTS: Prompt[] = [
  { area: "Collections", text: "Who owes us the most right now?" },
  { area: "Collections", text: "Which invoices are more than 30 days overdue?" },
  { area: "Collections", text: "Who broke a payment promise this month?" },
  { area: "Collections", text: "Which customers need a firm reminder this week?" },
  { area: "Cash", text: "How much cash should come in over the next 14 days?" },
  { area: "Cash", text: "What is our total outstanding, and how much of it is overdue?" },
  { area: "Customers", text: "Which customers usually pay late, and by how many days?" },
  { area: "Customers", text: "Who are our best-paying customers?" },
  { area: "Customers", text: "Which customers have gone quiet for more than 30 days?" },
  { area: "Sales", text: "Which customers bought the most this month?" },
];
