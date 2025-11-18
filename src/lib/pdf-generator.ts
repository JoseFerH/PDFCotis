import jsPDF from "jspdf";
import type { QuoteFormValues } from "@/components/quote-generator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
};

export const generateQuotePdf = (data: QuoteFormValues) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  let y = 0;

  // Colors
  const primaryColor = "#2B2A4C";
  const secondaryColor = "#B4A5A5";
  const textColor = "#333333";
  const whiteColor = "#FFFFFF";

  // Fonts
  doc.addFont("helvetica", "normal", "normal");
  doc.addFont("helvetica", "bold", "bold");
  
  // --- PDF Header ---
  y = 0;
  doc.setFillColor(primaryColor);
  doc.rect(0, y, pageWidth, 30, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(whiteColor);
  doc.text("Creati", 20, 15);
  doc.setFont("helvetica", "normal");
  doc.text("Studio", 42, 15);
  
  doc.setFontSize(10);
  doc.text("Creamos tus ideas", pageWidth - 20, 18, { align: "right" });
  y = 35;
  
  // --- Quote Details ---
  doc.setFontSize(9);
  doc.setTextColor(textColor);
  
  const fieldHeight = 7;
  const fieldBorderRadius = 3;

  // Client and Contact
  doc.setFillColor(primaryColor);
  doc.roundedRect(20, y, 25, fieldHeight, fieldBorderRadius, fieldBorderRadius, "F");
  doc.setTextColor(whiteColor);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", 23, y + 5);
  
  doc.roundedRect(20, y + 10, 25, fieldHeight, fieldBorderRadius, fieldBorderRadius, "F");
  doc.text("Contacto:", 23, y + 15);
  
  doc.setTextColor(textColor);
  doc.setFont("helvetica", "normal");
  doc.text(data.clientName, 50, y + 5);
  doc.text(data.contact, 50, y + 15);


  // Quote Number and Date
  const quoteNoX = pageWidth - 80;
  doc.setFont("helvetica", "bold");
  doc.text("Cotización No.", quoteNoX, y + 5);
  doc.text("Fecha de cotización:", quoteNoX, y + 15);
  
  doc.setFillColor(primaryColor);
  doc.roundedRect(quoteNoX + 40, y + 1, 35, fieldHeight, fieldBorderRadius, fieldBorderRadius, "F");
  doc.roundedRect(quoteNoX + 40, y + 11, 35, fieldHeight, fieldBorderRadius, fieldBorderRadius, "F");

  doc.setTextColor(whiteColor);
  doc.setFont("helvetica", "normal");
  doc.text(data.quoteNumber, quoteNoX + 42, y + 6);
  doc.text(format(data.quoteDate, "dd/MM/yyyy", { locale: es }), quoteNoX + 42, y + 16);
  
  y += 30;

  // --- Intro Text ---
  doc.setTextColor(textColor);
  doc.setFont("helvetica", "bold");
  doc.text("Estimado/a cliente:", 20, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const introText = "Adjuntamos la cotización detallada que ha solicitado. En Creati nos complace ofrecer soluciones de alta calidad y a medida para sus necesidades.";
  const splitIntro = doc.splitTextToSize(introText, pageWidth - 40);
  doc.text(splitIntro, 20, y);
  y += (splitIntro.length * 5) + 10;
  
  
  // --- Items Table ---
  const tableStartY = y;
  const tableHeaderHeight = 10;
  const tableBottomMargin = 90;

  // Table Header
  doc.setFillColor(primaryColor);
  doc.roundedRect(20, y, pageWidth - 40, tableHeaderHeight, 5, 5, "F");
  doc.setTextColor(whiteColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Descripción", 25, y + 7);
  doc.text("Precio", pageWidth - 25, y + 7, { align: "right" });
  y += tableHeaderHeight + 5;
  
  // Table Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(textColor);

  data.items.forEach((item) => {
    if (y > pageHeight - tableBottomMargin) {
      doc.addPage();
      y = 20;
    }
    const priceText = formatCurrency(item.price);
    const priceWidth = doc.getTextWidth(priceText) + 5;
    const descriptionWidth = pageWidth - 50 - priceWidth;
    
    const splitDescription = doc.splitTextToSize(item.description, descriptionWidth);
    
    const itemLineHeight = (splitDescription.length * 5) + 5;

    if (y + itemLineHeight > pageHeight - tableBottomMargin) {
        doc.addPage();
        y = 20;
    }

    doc.text(splitDescription, 25, y);
    doc.text(priceText, pageWidth - 25, y, { align: "right" });
    y += itemLineHeight;
  });

  // --- Totals Section ---
  const totalsYStart = pageHeight - 80;
  if(y < totalsYStart) {
    y = totalsYStart;
  } else {
    y += 5;
  }
  
  const totalsX = pageWidth - 90;
  const totalValueX = pageWidth - 25;

  const subtotal = data.items.reduce((acc, item) => acc + item.price, 0);
  const discountPercentage = data.includeDiscount ? parseInt(data.discountPercentage || "0", 10) : 0;
  const discountAmount = (subtotal * discountPercentage) / 100;
  const totalAfterDiscount = subtotal - discountAmount;
  const iva = totalAfterDiscount * 0.16;
  const total = totalAfterDiscount + iva;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Total sin descuento:", totalsX, y, {align: "right"});
  doc.text(formatCurrency(subtotal), totalValueX, y, { align: "right" });
  y += 7;

  if (data.includeDiscount && discountAmount > 0) {
    doc.setTextColor("#d9534f"); // Red for discount
    doc.setFont("helvetica", "bold");
    doc.text("Descuento:", totalsX, y, {align: "right"});
    doc.text(`-${formatCurrency(discountAmount)}`, totalValueX, y, { align: "right" });
    y += 7;
    doc.setTextColor(textColor);
    doc.setFont("helvetica", "normal");

    doc.text("Total con descuento:", totalsX, y, {align: "right"});
    doc.text(formatCurrency(totalAfterDiscount), totalValueX, y, { align: "right" });
    y += 7;
  }
  
  doc.text("IVA (16%):", totalsX, y, {align: "right"});
  doc.text(formatCurrency(iva), totalValueX, y, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", totalsX, y, {align: "right"});
  doc.setFillColor("#E9F5FF");
  doc.roundedRect(totalsX + 2, y - 5, 60, 8, 3, 3, "F");
  doc.text(formatCurrency(total), totalValueX, y, { align: "right" });
  y += 10;
  
  // Dashed line for table
  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(secondaryColor);
  doc.line(totalsX - 5, tableStartY + tableHeaderHeight, totalsX - 5, y -10);
  doc.setLineDashPattern([], 0);

  // Table container
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(18, tableStartY -2, pageWidth - 36, y - tableStartY + 2, 8, 8, "S");
  

  // --- Terms ---
  y = pageHeight - 35;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const termsText = "Este presupuesto es válido por 10 días a partir de su fecha de emisión y está diseñado específicamente para responder a las necesidades actuales de la empresa, considerando su tipo, sector, y los requisitos para la futura implementación de la solución propuesta.";
  const splitTerms = doc.splitTextToSize(termsText, pageWidth - 40);
  doc.text(splitTerms, pageWidth / 2, y, { align: "center" });

  // --- PDF Footer ---
  doc.setFillColor(primaryColor);
  doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(whiteColor);
  doc.text("Creati Studio", 20, pageHeight - 6);
  
  const footerText = "Diseño | Publicidad   📞 30165995";
  doc.text(footerText, pageWidth - 20, pageHeight - 6, { align: "right" });

  doc.save(`cotizacion-${data.quoteNumber}.pdf`);
};
