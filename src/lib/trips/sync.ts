import { supabase } from "@/lib/supabase/client";

export type PlanStatus = "todo" | "doing" | "done";
export type PlanTag = "transport" | "stay" | "todo" | "tickets" | "other";

export type PlanItem = {
  id: string;
  trip_id: string;
  user_id: string;
  text: string;
  status: PlanStatus;
  tag: PlanTag;
  created_at: string;
};

export type ChecklistItem = {
  id: string;
  trip_id: string;
  user_id: string;
  text: string;
  done: boolean;
  created_at: string;
};

export type BudgetPerson = {
  id: string;
  trip_id: string;
  name: string;
  created_at: string;
};

export type BudgetExpense = {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  paid_by: string;
  split_among: string[];
  created_at: string;
};

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) throw new Error("Brak użytkownika");
  return data.user.id;
}

function uuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

export async function listPlanItems(tripId: string) {
  const { data, error } = await supabase
    .from("trip_plan_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as PlanItem[];
}

export async function addPlanItem(tripId: string, text: string, tag: PlanTag) {
  const userId = await getUserId();
  const { error } = await supabase.from("trip_plan_items").insert({
    id: uuid(),
    trip_id: tripId,
    user_id: userId,
    text,
    status: "todo",
    tag,
  });
  if (error) throw error;
}

export async function updatePlanItem(id: string, patch: Partial<Pick<PlanItem, "text" | "status" | "tag">>) {
  const { error } = await supabase.from("trip_plan_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePlanItem(id: string) {
  const { error } = await supabase.from("trip_plan_items").delete().eq("id", id);
  if (error) throw error;
}

export async function clearDonePlanItems(tripId: string) {
  const { error } = await supabase
    .from("trip_plan_items")
    .delete()
    .eq("trip_id", tripId)
    .eq("status", "done");
  if (error) throw error;
}

export async function listChecklistItems(tripId: string) {
  const { data, error } = await supabase
    .from("trip_checklist_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ChecklistItem[];
}

export async function addChecklistItem(tripId: string, text: string) {
  const userId = await getUserId();
  const { error } = await supabase.from("trip_checklist_items").insert({
    id: uuid(),
    trip_id: tripId,
    user_id: userId,
    text,
    done: false,
  });
  if (error) throw error;
}

export async function updateChecklistItem(id: string, patch: Partial<Pick<ChecklistItem, "text" | "done">>) {
  const { error } = await supabase.from("trip_checklist_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: string) {
  const { error } = await supabase.from("trip_checklist_items").delete().eq("id", id);
  if (error) throw error;
}

export async function clearDoneChecklistItems(tripId: string) {
  const { error } = await supabase
    .from("trip_checklist_items")
    .delete()
    .eq("trip_id", tripId)
    .eq("done", true);
  if (error) throw error;
}

export async function listBudgetPeople(tripId: string) {
  const { data, error } = await supabase
    .from("trip_budget_people")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as BudgetPerson[];
}

export async function addBudgetPerson(tripId: string, name: string) {
  const { error } = await supabase.from("trip_budget_people").insert({
    trip_id: tripId,
    name,
  });
  if (error) throw error;
}

export async function deleteBudgetPerson(id: string) {
  const { error } = await supabase.from("trip_budget_people").delete().eq("id", id);
  if (error) throw error;
}

export async function listBudgetExpenses(tripId: string) {
  const { data, error } = await supabase
    .from("trip_budget_expenses")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data || []) as any[]).map((row) => ({
    ...row,
    amount: Number(row.amount),
    split_among: Array.isArray(row.split_among) ? row.split_among : [],
  })) as BudgetExpense[];
}

export async function addBudgetExpense(
  tripId: string,
  payload: { title: string; amount: number; paid_by: string; split_among: string[] }
) {
  const { error } = await supabase.from("trip_budget_expenses").insert({
    id: uuid(),
    trip_id: tripId,
    ...payload,
  });
  if (error) throw error;
}

export async function deleteBudgetExpense(id: string) {
  const { error } = await supabase.from("trip_budget_expenses").delete().eq("id", id);
  if (error) throw error;
}
