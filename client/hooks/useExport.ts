import { useAuth } from "./useAuth";

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useExportPDF() {
  const { token } = useAuth();
  return async (year: number, month: number) => {
    const res = await fetch(`/api/export/pdf?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${token ?? ""}` },
    });
    if (!res.ok) throw new Error("PDF export failed");
    const blob = await res.blob();
    downloadFile(blob, `report-${year}-${String(month).padStart(2, "0")}.pdf`);
  };
}

export function useExportExcel() {
  const { token } = useAuth();
  return async (year: number, month: number) => {
    const res = await fetch(`/api/export/excel?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${token ?? ""}` },
    });
    if (!res.ok) throw new Error("Excel export failed");
    const blob = await res.blob();
    downloadFile(blob, `report-${year}-${String(month).padStart(2, "0")}.xlsx`);
  };
}
