import { useState, useEffect, useCallback } from "react";
import { Plus, ScanLine, Trash2, Pencil, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecurring, useDeactivateRecurring } from "@/hooks/useRecurring";
import { useDeleteIncome } from "@/hooks/useIncome";
import { useDeleteExpense } from "@/hooks/useExpenses";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { IncomeForm } from "@/components/forms/IncomeForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { RecurringExpenseForm } from "@/components/forms/RecurringExpenseForm";
import type { TransactionRecord, OCRResponse } from "../../shared/api";
import { formatGHS } from "../../shared/formatCurrency";

export default function Transactions() {
  const { token } = useAuth();

  // Refresh key — increment to trigger re-fetch of income & expenses
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Income state
  const [income, setIncome] = useState<TransactionRecord[]>([]);
  const [incLoading, setIncLoading] = useState(true);

  useEffect(() => {
    setIncLoading(true);
    api
      .get<TransactionRecord[]>("/api/income")
      .then(setIncome)
      .catch(console.error)
      .finally(() => setIncLoading(false));
  }, [refreshKey]);

  // Expenses state
  const [expenses, setExpenses] = useState<TransactionRecord[]>([]);
  const [expLoading, setExpLoading] = useState(true);

  useEffect(() => {
    setExpLoading(true);
    api
      .get<TransactionRecord[]>("/api/expenses")
      .then(setExpenses)
      .catch(console.error)
      .finally(() => setExpLoading(false));
  }, [refreshKey]);

  const { data: recurring = [] } = useRecurring();

  const deleteIncome = useDeleteIncome();
  const deleteExpense = useDeleteExpense();
  const deactivate = useDeactivateRecurring();

  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [recurringFormOpen, setRecurringFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<TransactionRecord | undefined>();
  const [editingExpense, setEditingExpense] = useState<TransactionRecord | undefined>();

  // OCR state
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPrefill, setOcrPrefill] = useState<{ amount?: string | null; date?: string | null; vendor?: string | null } | undefined>();

  async function handleOcrSubmit() {
    if (!ocrFile) return;
    setOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append("receipt", ocrFile);
      const res = await fetch("/api/receipts/ocr", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "OCR failed" }));
        throw new Error(err.error);
      }
      const data: OCRResponse = await res.json();
      setOcrPrefill({
        amount: data.extracted.amount.value,
        date: data.extracted.date.value,
        vendor: data.extracted.vendor.value,
      });
      setOcrDialogOpen(false);
      setExpenseFormOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "OCR failed");
    } finally {
      setOcrLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Transactions</h1>

      <Tabs defaultValue="income">
        <TabsList className="mb-4">
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>

        {/* Income tab */}
        <TabsContent value="income">
          <div className="flex justify-end mb-3">
            <Button onClick={() => { setEditingIncome(undefined); setIncomeFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Income
            </Button>
          </div>
          {incLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400 w-6 h-6" /></div>
          ) : income.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No income records yet.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {income.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{rec.date}</td>
                      <td className="px-4 py-3">{rec.category}</td>
                      <td className="px-4 py-3 text-gray-500">{rec.description ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatGHS(parseFloat(rec.amount))}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => { setEditingIncome(rec); setIncomeFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 p-0 text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm("Delete this income record?"))
                                deleteIncome.mutate(rec.id, { onSuccess: () => { toast.success("Deleted"); refresh(); } });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Expenses tab */}
        <TabsContent value="expenses">
          <div className="flex justify-end gap-2 mb-3">
            <Button variant="outline" onClick={() => setOcrDialogOpen(true)}>
              <ScanLine className="w-4 h-4 mr-1" /> Scan Receipt
            </Button>
            <Button onClick={() => { setEditingExpense(undefined); setOcrPrefill(undefined); setExpenseFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Expense
            </Button>
          </div>
          {expLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400 w-6 h-6" /></div>
          ) : expenses.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No expense records yet.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{rec.date}</td>
                      <td className="px-4 py-3">{rec.category}</td>
                      <td className="px-4 py-3 text-gray-500">{rec.description ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{formatGHS(parseFloat(rec.amount))}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => { setEditingExpense(rec); setExpenseFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 p-0 text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm("Delete this expense?"))
                                deleteExpense.mutate(rec.id, { onSuccess: () => { toast.success("Deleted"); refresh(); } });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Recurring tab */}
        <TabsContent value="recurring">
          <div className="flex justify-end mb-3">
            <Button onClick={() => setRecurringFormOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Recurring
            </Button>
          </div>
          {recurring.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No recurring expenses set up.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm min-w-[580px]">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Interval</th>
                    <th className="px-4 py-3 text-left">Next Run</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recurring.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{rec.description}</td>
                      <td className="px-4 py-3">{rec.category}</td>
                      <td className="px-4 py-3 capitalize">{rec.interval}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(rec.next_run_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatGHS(parseFloat(rec.amount))}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-orange-500 hover:text-orange-700" onClick={() => { if (confirm("Deactivate this recurring expense?")) deactivate.mutate(rec.id, { onSuccess: () => toast.success("Deactivated") }); }}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {incomeFormOpen && (
        <IncomeForm
          existing={editingIncome}
          onClose={() => {
            setIncomeFormOpen(false);
            setEditingIncome(undefined);
            refresh();
          }}
        />
      )}
      {expenseFormOpen && (
        <ExpenseForm
          existing={editingExpense}
          prefill={ocrPrefill}
          onClose={() => {
            setExpenseFormOpen(false);
            setEditingExpense(undefined);
            setOcrPrefill(undefined);
            refresh();
          }}
        />
      )}
      {recurringFormOpen && <RecurringExpenseForm onClose={() => setRecurringFormOpen(false)} />}

      {/* OCR dialog */}
      <Dialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Scan Receipt</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ocr-file">Upload Receipt (JPEG, PNG, or PDF, max 10 MB)</Label>
              <Input
                id="ocr-file"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setOcrFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOcrDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleOcrSubmit} disabled={!ocrFile || ocrLoading}>
                {ocrLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Extract Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
