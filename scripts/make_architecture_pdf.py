"""Render docs/SYSTEM_ARCHITECTURE.md into a PDF using reportlab.

Minimal Markdown -> Platypus converter: headings, paragraphs, bullet and
numbered lists, tables, fenced code blocks, inline code and bold.
"""

import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "SYSTEM_ARCHITECTURE.md"
OUT = ROOT / "docs" / "SYSTEM_ARCHITECTURE.pdf"

ACCENT = colors.HexColor("#d98f4e")
INK = colors.HexColor("#1a2027")
MUTED = colors.HexColor("#565d64")
LINE = colors.HexColor("#cbd2d9")

_styles = getSampleStyleSheet()


def _style(name: str, **kw) -> ParagraphStyle:
    base = kw.pop("parent", _styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)


TITLE = _style("Title", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=INK)
H1 = _style("H1", fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=INK,
            spaceBefore=16, spaceAfter=6)
H2 = _style("H2", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=ACCENT,
            spaceBefore=12, spaceAfter=4)
BODY = _style("Body", fontName="Helvetica", fontSize=9.5, leading=14, textColor=INK,
              spaceAfter=6)
BULLET = _style("Bullet", parent=BODY, leftIndent=14, bulletIndent=4, spaceAfter=3)
CODE = _style("Code", fontName="Courier", fontSize=8, leading=10.5, textColor=INK,
              backColor=colors.HexColor("#f2f4f6"), borderPadding=6, leftIndent=2)


def _escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _inline(text: str) -> str:
    escaped = _escape(text)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"`([^`]+)`", r'<font face="Courier" size="8.5">\1</font>', escaped)
    return escaped


def _parse_table(lines: list[str]) -> Table:
    rows = []
    for line in lines:
        if re.match(r"^\s*\|?[\s:|-]+\|?\s*$", line):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        rows.append([Paragraph(_inline(c), BULLET) for c in cells])
    table = Table(rows, colWidths=None, hAlign="LEFT")
    table.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BACKGROUND", (0, 0), (-1, 0), INK),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.4, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    return table


def convert(markdown: str) -> list:
    flowables: list = []
    lines = markdown.splitlines()
    i = 0
    n = len(lines)
    first_heading_done = False

    while i < n:
        line = lines[i]

        if not line.strip():
            i += 1
            continue

        if line.startswith("```"):
            i += 1
            buf = []
            while i < n and not lines[i].startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1
            flowables.append(Preformatted("\n".join(buf), CODE))
            flowables.append(Spacer(1, 4))
            continue

        if line.startswith("### "):
            flowables.append(Paragraph(_inline(line[4:]), H2))
            i += 1
            continue

        if line.startswith("## "):
            flowables.append(Paragraph(_inline(line[3:]), H1))
            i += 1
            continue

        if line.startswith("# "):
            title = line[2:]
            flowables.append(Paragraph(_inline(title), TITLE))
            flowables.append(Spacer(1, 4))
            first_heading_done = True
            i += 1
            continue

        if re.match(r"^\s*\|", line):
            table_lines = []
            while i < n and re.match(r"^\s*\|", lines[i]):
                table_lines.append(lines[i])
                i += 1
            flowables.append(_parse_table(table_lines))
            flowables.append(Spacer(1, 6))
            continue

        if re.match(r"^\s*-\s+", line):
            items = []
            while i < n and re.match(r"^\s*-\s+", lines[i]):
                items.append(ListItem(Paragraph(_inline(lines[i].strip()[2:]), BULLET)))
                i += 1
            flowables.append(ListFlowable(items, bulletType="bullet", start="•",
                                          bulletFontSize=8, leftIndent=14))
            flowables.append(Spacer(1, 4))
            continue

        if re.match(r"^\s*\d+\.\s+", line):
            items = []
            while i < n and re.match(r"^\s*\d+\.\s+", lines[i]):
                body = re.sub(r"^\s*\d+\.\s+", "", lines[i])
                items.append(ListItem(Paragraph(_inline(body), BULLET)))
                i += 1
            flowables.append(ListFlowable(items, bulletType="1", leftIndent=18))
            flowables.append(Spacer(1, 4))
            continue

        if re.match(r"^\s*---+\s*$", line):
            i += 1
            continue

        flowables.append(Paragraph(_inline(line), BODY))
        i += 1

    return flowables


def build_pdf() -> int:
    markdown = SRC.read_text(encoding="utf-8")
    flowables = convert(markdown)

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=letter,
        rightMargin=0.7 * inch,
        leftMargin=0.7 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
        title="SatQuery — System Architecture & Tech Stack",
    )

    def footer(canvas, _doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(0.7 * inch, 0.45 * inch, "SatQuery — System Architecture")
        canvas.drawRightString(letter[0] - 0.7 * inch, 0.45 * inch, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()

    doc.build(flowables, onFirstPage=footer, onLaterPages=footer)
    return doc.page


if __name__ == "__main__":
    pages = build_pdf()
    print(f"wrote {OUT} ({pages} page(s))")
    sys.exit(0)
