import { useState } from "react";
import { Sparkles, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { ParsedTransaction } from "../../../shared/api";
import { formatGHS } from "../../../shared/formatCurrency";

const EXAMPLES = [
  "Spent 35 cedis on lunch today",
  "Received 1500 from my internship",
  "Paid 80 for MTN data",
  "Got 500 from mum yesterday",
];

interface NaturalLanguageInputProps {
  onSuccess: () => void;
}

export function NaturalLanguageInput({ onSuccess }: NaturalLanguageInputProps) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable preview fields
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<"expense" | "income">("expense");

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setParsing(true);
    try {
      const result = await api.post<ParsedTransaction>("/api/transactions/parse", { text });
      setParsed(result);
      setEditAmount(String(result.amount));
      setEditCategory(result.category);
      setEditDescription(result.description);
      setEditDate(result.date);
      setEditType(result.type);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse");
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!parsed) return;
    setSaving(true);
    try {
      const payload = {
        amount: parseFloat(editAmount),
        category: editCategory,
        description: editDescription,
        date: editDate,
      };
      const endpoint = editType === "expense" ? "/api/expenses" : "/api/income";
      await api.post(endpoint, payload);
      toast.success(`${editType === "expense" ? "Expense" : "Income"} added`);
      setParsed(null);
      setText("");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const confidenceColor = {
    high: "bg-emerald-100 text-emerald-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-red-100 text-red-700",
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-gray-700">Quick Add</span>
          <span className="text-xs text-gray-400">— describe a transaction in plain text</span>
        </div>

        <form onSubmit={handleParse} className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Spent 35 cedis on lunch today"
            className="flex-1"
            disabled={parsing}
          />
          <Button
            type="submit"
            disabled={parsing || !text.trim()}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shrink-0"
          >
            {parsing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Add"
            )}
          </Button>
        </form>

        {/* Example suggestions */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              className="text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={!!parsed} onOpenChange={(o) => { if (!o) setParsed(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Transaction Preview
              {parsed && (
                <Badge className={`text-xs ${confidenceColor[parsed.confidence]}`}>
                  {parsed.confidence} confidence
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {parsed && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-gray-400 italic">"{parsed.raw}"</p>

              {/* Type toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditType("expense")}
                  className={`flex-1 py-1.5 text-sm rounded-md border transition-colors ${
                    editType === "expense"
                      ? "bg-red-50 border-red-300 text-red-700 font-medium"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Expense
                </button>
                <button
                  onClick={() => setEditType("income")}
                  className={`flex-1 py-1.5 text-sm rounded-md border transition-colors ${
                    editType === "income"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-medium"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Income
                </button>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Amount (GHS)</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Date</Label>
                    <Input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Category</Label>
                  <Input
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Description</Label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className={`rounded-lg p-3 text-sm ${editType === "expense" ? "bg-red-50" : "bg-emerald-50"}`}>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className={`font-semibold ${editType === "expense" ? "text-red-600" : "text-emerald-600"}`}>
                    {editType === "expense" ? "−" : "+"}{formatGHS(parseFloat(editAmount) || 0)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setParsed(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  onClick={handleConfirm}
                  disabled={saving || !editAmount || parseFloat(editAmount) <= 0}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
