import jsPDF from "jspdf";
import type { QuoteFormValues } from "@/components/quote-generator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN', // Or a generic currency
  }).format(amount);
};

export const generateQuotePdf = (data: QuoteFormValues) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  let y = 20;

  // --- PDF Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor("#3498db"); // Primary color
  doc.text("COTIZACIÓN", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  // Add company details (placeholder)
  doc.text("Tu Nombre/Empresa", 20, y);
  doc.text("tu.email@example.com", pageWidth - 20, y, { align: "right" });
  y += 5;
  doc.text("Calle Falsa 123, Ciudad", 20, y);
  doc.text("+1 (23) 456-7890", pageWidth - 20, y, { align: "right" });
  y += 10;

  doc.setDrawColor(236, 240, 241); // background color lightened
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 10;

  // --- Quote Details ---
  doc.setFontSize(12);
  doc.setTextColor(40);
  
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.clientName, 45, y);

  doc.setFont("helvetica", "bold");
  doc.text("Cotización No:", pageWidth - 70, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.quoteNumber, pageWidth - 20, y, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Contacto:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.contact, 45, y);

  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", pageWidth - 70, y);
  doc.setFont("helvetica", "normal");
  doc.text(format(data.quoteDate, "dd 'de' MMMM, yyyy", { locale: es }), pageWidth - 20, y, { align: "right" });
  y += 15;

  // --- Items Table Header ---
  doc.setFillColor(236, 240, 241); // Light gray background
  doc.rect(15, y, pageWidth - 30, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40);
  doc.text("Descripción del Servicio/Producto", 20, y + 7);
  doc.text("Precio", pageWidth - 20, y + 7, { align: "right" });
  y += 15;

  // --- Items Table Rows ---
  doc.setFont("helvetica", "normal");
  data.items.forEach((item) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }
    const splitDescription = doc.splitTextToSize(item.description, (pageWidth - 90));
    doc.text(splitDescription, 20, y);
    doc.text(formatCurrency(item.price), pageWidth - 20, y, { align: "right" });
    y += (splitDescription.length * 5) + 5;
  });

  // --- Totals Section ---
  y += 10;
  if (y > pageHeight - 60) {
      doc.addPage();
      y = 20;
  }
  
  const totalsX = pageWidth - 70;
  
  const subtotal = data.items.reduce((acc, item) => acc + item.price, 0);
  const discountPercentage = data.includeDiscount ? parseInt(data.discountPercentage || "0", 10) : 0;
  const discountAmount = (subtotal * discountPercentage) / 100;
  const totalAfterDiscount = subtotal - discountAmount;
  const iva = totalAfterDiscount * 0.16;
  const total = totalAfterDiscount + iva;

  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX, y);
  doc.text(formatCurrency(subtotal), pageWidth - 20, y, { align: "right" });
  y += 7;

  if (data.includeDiscount && discountAmount > 0) {
    doc.setTextColor(220, 53, 69); // Destructive color
    doc.text(`Descuento (${discountPercentage}%):`, totalsX, y);
    doc.text(`-${formatCurrency(discountAmount)}`, pageWidth - 20, y, { align: "right" });
    y += 7;
    doc.setTextColor(40);
  }

  doc.text("IVA (16%):", totalsX, y);
  doc.text(formatCurrency(iva), pageWidth - 20, y, { align: "right" });
  y += 7;

  doc.setLineWidth(0.2);
  doc.line(totalsX - 5, y, pageWidth - 15, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TOTAL:", totalsX, y);
  doc.text(formatCurrency(total), pageWidth - 20, y, { align: "right" });
  y += 15;

  // --- Footer ---
  doc.setFontSize(9);
  doc.setTextColor(150);
  const terms = "Precios sujetos a cambio sin previo aviso. Validez de la cotización: 30 días.";
  doc.text(terms, pageWidth / 2, pageHeight - 15, { align: "center" });

  doc.save(`cotizacion-${data.quoteNumber}.pdf`);
};
