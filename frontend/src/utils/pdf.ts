import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type PdfColumn = { header: string; key: string; align?: 'left' | 'right' | 'center' };

export function exportTablePdf(options: {
  title: string;
  subtitle?: string;
  filename: string;
  columns: PdfColumn[];
  rows: Record<string, string | number>[];
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ОптСклад', 14, 14);
  doc.setFontSize(11);
  doc.text(options.title, 14, 22);
  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(options.subtitle, 14, 28);
  }

  autoTable(doc, {
    startY: options.subtitle ? 32 : 26,
    head: [options.columns.map((c) => c.header)],
    body: options.rows.map((row) =>
      options.columns.map((c) => String(row[c.key] ?? '')),
    ),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [4, 120, 87] },
    columnStyles: Object.fromEntries(
      options.columns.map((c, i) => [i, { halign: c.align ?? 'left' }]),
    ),
    margin: { left: 14, right: 14 },
    tableWidth: pageWidth - 28,
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Згенеровано ${new Date().toLocaleString('uk-UA')} · стор. ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 8,
    );
  }

  doc.save(options.filename);
}
