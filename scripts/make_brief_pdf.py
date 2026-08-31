"""Render docs/BRIEF_PRESENTATION.md into a presentation PDF."""

import re
import sys
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable, ListItem, Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle
)

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "BRIEF_PRESENTATION.md"
OUT = ROOT / "docs" / "BRIEF_PRESENTATION.pdf"

VOID = colors.HexColor("#0a0c0e")
SIGNAL = colors.HexColor("#8CFFBE")
INK = colors.HexColor("#1a2027")
MUTED = colors.HexColor("#565d64")
LINE = colors.HexColor("#262e35")
ACCENT = colors.HexColor("#1a2e26")

_styles = getSampleStyleSheet()

def _style(name, **kw):
    base = kw.pop("parent", _styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

TITLE = _style("Title", fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=VOID, spaceAfter=4)
SUBTITLE = _style("Subtitle", fontName="Helvetica", fontSize=10, leading=14, textColor=MUTED, spaceAfter=12)
H1 = _style("H1", fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=VOID, spaceBefore=14, spaceAfter=6, borderPadding=(0,0,4,0))
H2 = _style("H2", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=SIGNAL, backColor=VOID, borderPadding=(4,6,4,6), spaceBefore=10, spaceAfter=6)
BODY = _style("Body", fontName="Helvetica", fontSize=9.5, leading=14, textColor=INK, spaceAfter=5)
BULLET = _style("Bullet", parent=BODY, leftIndent=14, bulletIndent=4, spaceAfter=3)
CODE = _style("Code", fontName="Courier", fontSize=8, leading=10.5, textColor=INK, backColor=colors.HexColor("#f2f4f6"), borderPadding=6)

def _esc(t): return t.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
def _inline(t):
    s=_esc(t)
    s=re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s=re.sub(r"`([^`]+)`", r'<font face="Courier" size="8.5">\1</font>', s)
    return s

def _parse_table(lines):
    rows=[]
    for line in lines:
        if re.match(r"^\s*\|?[\s:|-]+\|?\s*$", line): continue
        cells=[c.strip() for c in line.strip().strip("|").split("|")]
        rows.append([Paragraph(_inline(c), BULLET) for c in cells])
    t=Table(rows, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,0),9),("TEXTCOLOR",(0,0),(-1,0),colors.white),("BACKGROUND",(0,0),(-1,0),VOID),
        ("FONTSIZE",(0,1),(-1,-1),8.5),("GRID",(0,0),(-1,-1),0.4,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#f8fafb")]),
    ]))
    return t

def convert(md):
    flow=[]
    lines=md.splitlines(); i=0; n=len(lines)
    while i<n:
        line=lines[i]
        if not line.strip(): i+=1; continue
        if line.startswith("```"):
            i+=1; buf=[]
            while i<n and not lines[i].startswith("```"): buf.append(lines[i]); i+=1
            i+=1; flow.append(Preformatted("\n".join(buf), CODE)); flow.append(Spacer(1,4)); continue
        if line.startswith("### "): flow.append(Paragraph(_inline(line[4:]), H2)); i+=1; continue
        if line.startswith("## "): flow.append(Paragraph(_inline(line[3:]), H1)); i+=1; continue
        if line.startswith("# "):
            flow.append(Paragraph(_inline(line[2:]), TITLE))
            # subtitle is next blockquote line if exists
            i+=1
            if i<n and lines[i].startswith(">"):
                flow.append(Paragraph(_inline(lines[i].lstrip("> ")), SUBTITLE))
                i+=1
            flow.append(Spacer(1,2))
            continue
        if line.startswith(">"):
            flow.append(Paragraph(_inline(line.lstrip("> ")), _style("Quote", parent=BODY, textColor=MUTED, leftIndent=8, borderPadding=(4,0,4,8), backColor=colors.HexColor("#f0f4f2"))))
            i+=1; continue
        if re.match(r"^\s*\|", line):
            tbl=[]; 
            while i<n and re.match(r"^\s*\|", lines[i]): tbl.append(lines[i]); i+=1
            flow.append(_parse_table(tbl)); flow.append(Spacer(1,6)); continue
        if re.match(r"^\s*-\s+", line):
            items=[]
            while i<n and re.match(r"^\s*-\s+", lines[i]): items.append(ListItem(Paragraph(_inline(lines[i].strip()[2:]), BULLET))); i+=1
            flow.append(ListFlowable(items, bulletType="bullet", start="•", bulletFontSize=8, leftIndent=14)); flow.append(Spacer(1,4)); continue
        if re.match(r"^\s*\d+\.\s+", line):
            items=[]
            while i<n and re.match(r"^\s*\d+\.\s+", lines[i]):
                body=re.sub(r"^\s*\d+\.\s+", "", lines[i]); items.append(ListItem(Paragraph(_inline(body), BULLET))); i+=1
            flow.append(ListFlowable(items, bulletType="1", leftIndent=18)); flow.append(Spacer(1,4)); continue
        if re.match(r"^\s*---+\s*$", line): i+=1; continue
        flow.append(Paragraph(_inline(line), BODY)); i+=1
    return flow

def build():
    md=SRC.read_text(encoding="utf-8")
    flow=convert(md)
    doc=SimpleDocTemplate(str(OUT), pagesize=letter, rightMargin=0.65*inch, leftMargin=0.65*inch, topMargin=0.6*inch, bottomMargin=0.6*inch, title="SatQuery — Brief Presentation")
    def footer(c,d):
        c.saveState(); c.setFont("Helvetica", 7); c.setFillColor(MUTED)
        c.drawString(0.65*inch, 0.4*inch, "SatQuery — Talk to the earth. Understand the change.")
        c.drawRightString(letter[0]-0.65*inch, 0.4*inch, f"Page {c.getPageNumber()}")
        # top signal line
        c.setStrokeColor(SIGNAL); c.setLineWidth(2); c.line(0.65*inch, letter[1]-0.5*inch, letter[0]-0.65*inch, letter[1]-0.5*inch)
        c.restoreState()
    doc.build(flow, onFirstPage=footer, onLaterPages=footer)
    return doc.page

if __name__=="__main__":
    p=build()
    print(f"wrote {OUT} ({p} page(s))")
