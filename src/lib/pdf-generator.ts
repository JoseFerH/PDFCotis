import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import type { QuoteFormValues } from "@/components/quote-generator";

const TEMPLATE_PATH = "/assets/COTICREATI.pdf";
const TABLE_DESCRIPTION_X = 85;
const TABLE_PRICE_X = 505;
const DESCRIPTION_WIDTH = 360;
const TABLE_ROW_GAP = 18;
const TABLE_START_OFFSET = 320;
const TABLE_BOTTOM_LIMIT = 210;
const TOTALS_START_Y = 185;
const NOTE_Y = 125;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    maximumFractionDigits: 2,
    currencyDisplay: "code"
  }).format(amount).replace("GTQ", "Q");
};

const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number) => {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const tentative = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(tentative, fontSize);
    if (width <= maxWidth) {
      current = tentative;
      return;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
};

const drawClientBlock = (
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  data: QuoteFormValues,
  pageHeight: number,
  pageWidth: number,
) => {
  const primaryColor = rgb(43 / 255, 42 / 255, 76 / 255);
  const textColor = rgb(38 / 255, 38 / 255, 38 / 255);
  const whiteColor = rgb(1, 1, 1);
  const leftX = 120;
  const rightX = pageWidth - 230;
  const baseY = pageHeight - 180;
  const lineHeight = 22;

  page.drawText(data.clientName, {
    x: leftX,
    y: baseY,
    size: 12,
    font: fonts.bold,
    color: primaryColor,
  });

  page.drawText(data.contact, {
    x: leftX,
    y: baseY - lineHeight,
    size: 11,
    font: fonts.regular,
    color: textColor,
  });

  const formattedDate = data.quoteDate ? format(data.quoteDate, "dd 'de' MMMM yyyy", { locale: es }) : '';

  page.drawText(data.quoteNumber, {
    x: rightX,
    y: baseY,
    size: 11,
    font: fonts.bold,
    color: whiteColor,
  });

  page.drawText(formattedDate, {
    x: rightX,
    y: baseY - lineHeight,
    size: 11,
    font: fonts.regular,
    color: whiteColor,
  });
};

const ensurePage = async (
  pdfDoc: PDFDocument,
  templateDoc: PDFDocument,
  targetIndex: number,
) => {
  while (pdfDoc.getPageCount() <= targetIndex) {
    const [copy] = await pdfDoc.copyPages(templateDoc, [0]);
    pdfDoc.addPage(copy);
  }
  return pdfDoc.getPages()[targetIndex];
};

const drawItemsTable = async (
  pdfDoc: PDFDocument,
  templateDoc: PDFDocument,
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  items: QuoteFormValues["items"],
  pageHeight: number,
) => {
  let currentPage = page;
  const pages = pdfDoc.getPages();
  const tableStartY = pageHeight - TABLE_START_OFFSET;
  const availableHeight = tableStartY - TABLE_BOTTOM_LIMIT;
  const rowsPerPage = Math.max(1, Math.floor(availableHeight / TABLE_ROW_GAP));
  const descriptionLineHeight = 13;
  const textColor = rgb(32 / 255, 32 / 255, 32 / 255);
  let currentY = tableStartY;
  let pageIndex = pages.indexOf(page);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (index > 0 && index % rowsPerPage === 0) {
      pageIndex += 1;
      currentPage = await ensurePage(pdfDoc, templateDoc, pageIndex);
      currentY = tableStartY;
    }

    const lines = wrapText(item.description, fonts.regular, 11, DESCRIPTION_WIDTH);
    const blockHeight = Math.max(descriptionLineHeight * lines.length, TABLE_ROW_GAP);

    lines.forEach((line, lineIndex) => {
      currentPage.drawText(line, {
        x: TABLE_DESCRIPTION_X,
        y: currentY - lineIndex * descriptionLineHeight,
        size: 11,
        font: fonts.regular,
        color: textColor,
      });
    });

    const priceText = formatCurrency(item.price);
    const priceWidth = fonts.regular.widthOfTextAtSize(priceText, 11);
    currentPage.drawText(priceText, {
      x: TABLE_PRICE_X - priceWidth,
      y: currentY,
      size: 11,
      font: fonts.bold,
      color: textColor,
    });

    currentY -= blockHeight + 5;
  }

  return { page: currentPage, y: Math.max(currentY, TABLE_BOTTOM_LIMIT) };
};

const drawTotals = (
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  totals: { label: string; value: string; emphasize?: boolean }[],
) => {
  let currentY = TOTALS_START_Y;
  const labelX = 375;
  const valueX = 520;
  const lineGap = 18;
  const textColor = rgb(35 / 255, 35 / 255, 35 / 255);

  totals.forEach((row) => {
    const font = row.emphasize ? fonts.bold : fonts.regular;
    const size = row.emphasize ? 13 : 11;
    const valueWidth = font.widthOfTextAtSize(row.value, size);

    page.drawText(row.label, {
      x: labelX,
      y: currentY,
      size,
      font,
      color: textColor,
    });

    page.drawText(row.value, {
      x: valueX - valueWidth,
      y: currentY,
      size,
      font,
      color: textColor,
    });

    currentY -= lineGap;
  });
};

export const generateQuotePdf = async (data: QuoteFormValues) => {
  if (typeof window === "undefined") {
    return;
  }

  const templateResponse = await fetch(TEMPLATE_PATH);
  if (!templateResponse.ok) {
    throw new Error("No se pudo cargar la plantilla base de la cotización.");
  }

  const templateBytes = await templateResponse.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const templateDoc = await PDFDocument.load(templateBytes);
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  const pages = pdfDoc.getPages();
  const [firstPage] = pages;
  const { height, width } = firstPage.getSize();

  drawClientBlock(firstPage, fonts, data, height, width);

  const { page: lastItemsPage } = await drawItemsTable(
    pdfDoc,
    templateDoc,
    firstPage,
    fonts,
    data.items,
    height,
  );

  const subtotal = data.items.reduce((acc, item) => acc + item.price, 0);
  const discountPercentage = data.includeDiscount ? data.discountPercentage || 0 : 0;
  const discountAmount = (subtotal * discountPercentage) / 100;
  const totalAfterDiscount = subtotal - discountAmount;
  const iva = totalAfterDiscount * 0.12;
  const total = totalAfterDiscount + iva;

  const totalsRows = [
    { label: "Subtotal:", value: formatCurrency(subtotal) },
  ];

  if (discountAmount > 0) {
    totalsRows.push({ label: "Descuento:", value: `- ${formatCurrency(discountAmount)}` });
    totalsRows.push({ label: "Subtotal con descuento:", value: formatCurrency(totalAfterDiscount) });
  }

  totalsRows.push({ label: "IVA (12%):", value: formatCurrency(iva) });
  totalsRows.push({ label: "Total:", value: formatCurrency(total), emphasize: true });

  drawTotals(lastItemsPage, fonts, totalsRows);

  const discountNote = data.includeDiscount && discountPercentage > 0
    ? `Descuento aplicado: ${discountPercentage}% (${formatCurrency(discountAmount)}).`
    : "Precios sujetos a cambios sin previo aviso.";

  lastItemsPage.drawText(discountNote, {
    x: TABLE_DESCRIPTION_X,
    y: NOTE_Y,
    size: 9,
    font: fonts.regular,
    color: rgb(90 / 255, 90 / 255, 90 / 255),
  });

  const form = pdfDoc.getForm();
  if (form.getFields().length > 0) {
    form.flatten();
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cotizacion-${data.quoteNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
