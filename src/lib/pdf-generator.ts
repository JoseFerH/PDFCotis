
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import type { QuoteFormValues } from "@/components/quote-generator";

const TEMPLATE_PATH = "/assets/COTICREATI.pdf";
const TABLE_DESCRIPTION_X = 85;
const TABLE_PRICE_X = 505;
const DESCRIPTION_WIDTH = 360;
const TABLE_ROW_GAP = 18;
const TABLE_START_OFFSET = 340;
const TABLE_BOTTOM_LIMIT = 210;
const TOTALS_START_Y = 201;
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

const drawLabeledContent = (
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  options?: { labelSize?: number; valueSize?: number; lineGap?: number },
) => {
  const labelSize = options?.labelSize ?? 11;
  const valueSize = options?.valueSize ?? 11;
  const lineGap = options?.lineGap ?? 16;
  const textColor = rgb(38 / 255, 38 / 255, 38 / 255);
  const labelColor = rgb(43 / 255, 42 / 255, 76 / 255);
  const lineHeight = 14;

  const content = value?.trim() ? value : "-";

  page.drawText(label, {
    x,
    y,
    size: labelSize,
    font: fonts.bold,
    color: labelColor,
  });

  const wrapped = wrapText(content, fonts.regular, valueSize, width);
  wrapped.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - labelSize - 4 - index * lineHeight,
      size: valueSize,
      font: fonts.regular,
      color: textColor,
    });
  });

  const usedHeight = labelSize + 4 + (wrapped.length - 1) * lineHeight;
  return y - usedHeight - lineGap;
};

const drawFirstPageDetails = (
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  data: QuoteFormValues,
  pageHeight: number,
) => {
  const startX = 95;
  const width = 440;
  let currentY = pageHeight - 167;

  currentY = drawLabeledContent(page, fonts, "", data.clientName, startX, currentY+4, width, {
    labelSize: 11,
  });
  currentY = drawLabeledContent(
    page,
    fonts,
    "",
    data.workDuration,
    startX+80,
    currentY+5,
    width,
  );
  currentY = drawLabeledContent(page, fonts, "", data.method, startX, currentY+5, width);
  currentY = drawLabeledContent(page, fonts, "", data.provider, startX+20, currentY+5, width);
  const formattedDate = data.quoteDate
    ? format(data.quoteDate, "dd/MM/yyyy")
    : "";
  currentY = drawLabeledContent(
    page,
    fonts,
    "",
    formattedDate,
    startX-5,
    currentY+6,
    width,
  );

  // Absolute positions
  const serviceGoalY = 460;
  const serviceIncludesY = 280;
  const commonX = 40;

  drawLabeledContent(
    page,
    fonts,
    "",
    data.serviceGoal,
    commonX,
    serviceGoalY,
    width,
    { lineGap: 20 },
  );

  drawLabeledContent(
    page,
    fonts,
    "",
    data.serviceIncludes,
    commonX,
    serviceIncludesY,
    width,
    { lineGap: 0 },
  );
};

const drawSecondPageDetails = (
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  data: QuoteFormValues,
  pageHeight: number,
) => {
  const startX = 40;
  const width = 440;
  
  // Absolute positions
  const deliveryTimeY = pageHeight - 165;
  const includedBonusY = pageHeight - 246;
  const whyCreatiY = pageHeight - 355;

  drawLabeledContent(
    page,
    fonts,
    "",
    data.deliveryTime,
    startX,
    deliveryTimeY,
    width,
  );

  drawLabeledContent(
    page,
    fonts,
    "",
    data.includedBonus,
    startX,
    includedBonusY,
    width,
  );

  drawLabeledContent(
    page,
    fonts,
    "",
    data.whyCreati,
    startX,
    whyCreatiY,
    width,
    { lineGap: 0 },
  );
};

const drawThirdPageHeader = (
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  data: QuoteFormValues,
  pageHeight: number,
  pageWidth: number,
) => {
  const primaryColor = rgb(43 / 255, 42 / 255, 76 / 255);
  const textColor = rgb(38 / 255, 38 / 255, 38 / 255);
  const whiteColor = rgb(1, 1, 1);
  const leftX = 140;
  const rightX = pageWidth - 130;
  const baseY = pageHeight - 158;
  const lineHeight = 18;

  page.drawText(data.clientName, {
    x: leftX,
    y: baseY+20,
    size: 10,
    font: fonts.bold,
    color: primaryColor,
  });

  page.drawText(data.contact, {
    x: leftX,
    y: baseY - lineHeight,
    size: 10,
    font: fonts.regular,
    color: primaryColor,
  });

  const formattedDate = data.quoteDate
    ? format(data.quoteDate, "dd/MM/yyyy")
    : "";

  page.drawText(data.quoteNumber, {
    x: rightX+5,
    y: baseY+20,
    size: 8,
    font: fonts.bold,
    color: whiteColor,
  });

  page.drawText(formattedDate, {
    x: rightX,
    y: baseY - lineHeight,
    size: 10,
    font: fonts.regular,
    color: whiteColor,
  });
};

const ensurePage = async (
  pdfDoc: PDFDocument,
  templateDoc: PDFDocument,
  targetIndex: number,
  templatePageIndex = 0,
) => {
  while (pdfDoc.getPageCount() <= targetIndex) {
    const [copy] = await pdfDoc.copyPages(templateDoc, [templatePageIndex]);
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
  templatePageIndex = 0,
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
      currentPage = await ensurePage(pdfDoc, templateDoc, pageIndex, templatePageIndex);
      currentY = tableStartY;
    }

    const lines = wrapText(item.description, fonts.regular, 11, DESCRIPTION_WIDTH);
    const blockHeight = Math.max(descriptionLineHeight * lines.length, TABLE_ROW_GAP);

    lines.forEach((line, lineIndex) => {
      currentPage.drawText(line, {
        x: TABLE_DESCRIPTION_X,
        y: currentY - lineIndex * descriptionLineHeight,
        size: 10,
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
  const labelX = 310;
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
  const pdfDoc = await PDFDocument.create();
  const templateDoc = await PDFDocument.load(templateBytes);
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  const [firstTemplatePage] = await pdfDoc.copyPages(templateDoc, [0]);
  pdfDoc.addPage(firstTemplatePage);
  const [secondTemplatePage] = await pdfDoc.copyPages(templateDoc, [1]);
  pdfDoc.addPage(secondTemplatePage);
  const [thirdTemplatePage] = await pdfDoc.copyPages(templateDoc, [2]);
  pdfDoc.addPage(thirdTemplatePage);
  
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const secondPage = pages[1];
  const thirdPage = pages[2];
  const { height, width } = firstPage.getSize();

  drawFirstPageDetails(firstPage, fonts, data, height);
  drawSecondPageDetails(secondPage, fonts, data, height);
  drawThirdPageHeader(thirdPage, fonts, data, height, width);

  const { page: lastItemsPage } = await drawItemsTable(
    pdfDoc,
    templateDoc,
    thirdPage,
    fonts,
    data.items,
    height,
    2,
  );

  const subtotal = data.items.reduce((acc, item) => acc + item.price, 0);
  const discountPercentage = data.includeDiscount ? data.discountPercentage || 0 : 0;
  const discountAmount = (subtotal * discountPercentage) / 100;
  const totalAfterDiscount = subtotal - discountAmount;
  const iva = totalAfterDiscount * 0.12;
  const total = totalAfterDiscount + iva;

  const totalsRows = [
    { label: "", value: formatCurrency(subtotal) },
  ];

  if (discountAmount > 0) {
    totalsRows.push({ label: `Descuento (${discountPercentage}%):`, value: `- ${formatCurrency(discountAmount)}` });
    totalsRows.push({ label: "", value: formatCurrency(totalAfterDiscount) });
  }

  totalsRows.push({ label: "IVA (12%):", value: formatCurrency(iva) });
  totalsRows.push({ label: "", value: formatCurrency(total), emphasize: true });

  drawTotals(lastItemsPage, fonts, totalsRows);

  const discountNote = data.includeDiscount && discountPercentage > 0
    ? `Descuento aplicado: ${discountPercentage}% (${formatCurrency(discountAmount)}).`
    : "";

  lastItemsPage.drawText(discountNote, {
    x: TABLE_DESCRIPTION_X,
    y: NOTE_Y,
    size: 9,
    font: fonts.regular,
    color: rgb(90 / 255, 90 / 255, 90 / 255),
  });
  
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