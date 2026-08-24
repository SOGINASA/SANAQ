"""Branded A4 workbook renderer for SANAQ lessons."""

from html import escape
from io import BytesIO
import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from services.lesson_guides import build_lesson_guide
from utils.localization import localized


INK = colors.HexColor("#232329")
PAPER = colors.HexColor("#FEFDF9")
LAVENDER = colors.HexColor("#5B3FA8")
LAVENDER_LIGHT = colors.HexColor("#E9E2FF")
MINT = colors.HexColor("#D9F7EB")
MINT_DARK = colors.HexColor("#16735A")
LIME = colors.HexColor("#C9F227")
STONE = colors.HexColor("#6F6B68")
STONE_LIGHT = colors.HexColor("#F2F0EB")
CORAL_LIGHT = colors.HexColor("#FFF0EC")


def _font_path(candidates):
    return next((path for path in candidates if path and os.path.exists(path)), None)


def _register_fonts():
    regular = _font_path([
        os.getenv("SANAQ_PDF_FONT_REGULAR"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ])
    bold = _font_path([
        os.getenv("SANAQ_PDF_FONT_BOLD"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        regular,
    ])
    if regular:
        pdfmetrics.registerFont(TTFont("SanaqSans", regular))
        pdfmetrics.registerFont(TTFont("SanaqSansBold", bold or regular))
        return "SanaqSans", "SanaqSansBold"
    return "Helvetica", "Helvetica-Bold"


def _clean(value):
    return str(value or "").replace("—", "-").replace("–", "-").replace("‑", "-")


def _safe(value):
    return escape(_clean(value)).replace("\n", "<br/>")


def _draw_logo(canvas, x, y, size):
    canvas.setFillColor(LAVENDER)
    canvas.roundRect(x, y, size, size, size * 0.28, fill=1, stroke=0)
    canvas.setStrokeColor(colors.white)
    canvas.setLineWidth(size * 0.07)
    cx, cy = x + size / 2, y + size / 2
    outer, inner = size * 0.34, size * 0.10
    path = canvas.beginPath()
    path.moveTo(cx, cy + outer)
    path.lineTo(cx + inner, cy + inner)
    path.lineTo(cx + outer, cy)
    path.lineTo(cx + inner, cy - inner)
    path.lineTo(cx, cy - outer)
    path.lineTo(cx - inner, cy - inner)
    path.lineTo(cx - outer, cy)
    path.lineTo(cx - inner, cy + inner)
    path.close()
    canvas.drawPath(path, fill=0, stroke=1)


def _page_decorator(font_regular, font_bold):
    def draw(canvas, document):
        canvas.saveState()
        width, height = A4
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, width, height, fill=1, stroke=0)
        _draw_logo(canvas, 18 * mm, height - 20 * mm, 8 * mm)
        canvas.setFont(font_bold, 10)
        canvas.setFillColor(INK)
        canvas.drawString(29 * mm, height - 15.6 * mm, "SANAQ WORKBOOK")
        canvas.setFont(font_regular, 8)
        canvas.setFillColor(STONE)
        canvas.drawRightString(width - 18 * mm, height - 15.6 * mm, "Учись в своём темпе")
        canvas.setStrokeColor(LAVENDER_LIGHT)
        canvas.line(18 * mm, height - 22 * mm, width - 18 * mm, height - 22 * mm)
        canvas.setFont(font_regular, 8)
        canvas.setFillColor(STONE)
        canvas.drawString(18 * mm, 11 * mm, "sanaq.kz · made by ITshechka")
        canvas.drawRightString(width - 18 * mm, 11 * mm, f"{canvas.getPageNumber()}")
        canvas.restoreState()
    return draw


def _styles(font_regular, font_bold):
    sample = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("SanaqTitle", parent=sample["Title"], fontName=font_bold, fontSize=25, leading=31, textColor=INK, alignment=TA_LEFT, spaceAfter=8 * mm),
        "page_title": ParagraphStyle("SanaqPageTitle", parent=sample["Heading1"], fontName=font_bold, fontSize=20, leading=25, textColor=INK, spaceAfter=6 * mm),
        "h2": ParagraphStyle("SanaqH2", parent=sample["Heading2"], fontName=font_bold, fontSize=13, leading=17, textColor=LAVENDER, spaceBefore=2 * mm, spaceAfter=2.5 * mm),
        "body": ParagraphStyle("SanaqBody", parent=sample["BodyText"], fontName=font_regular, fontSize=10.2, leading=15, textColor=INK, spaceAfter=2.5 * mm),
        "small": ParagraphStyle("SanaqSmall", parent=sample["BodyText"], fontName=font_regular, fontSize=8.5, leading=12, textColor=STONE),
        "callout": ParagraphStyle("SanaqCallout", parent=sample["BodyText"], fontName=font_bold, fontSize=11, leading=16, textColor=INK, borderColor=LAVENDER_LIGHT, borderWidth=1, borderPadding=9, backColor=colors.HexColor("#F4F1FF"), spaceAfter=4 * mm),
        "formula": ParagraphStyle("SanaqFormula", parent=sample["BodyText"], fontName=font_bold, fontSize=12, leading=18, textColor=INK, alignment=TA_CENTER, borderPadding=10, backColor=INK, borderColor=INK, textTransform=None, spaceAfter=4 * mm),
        "task": ParagraphStyle("SanaqTask", parent=sample["BodyText"], fontName=font_regular, fontSize=9.5, leading=14, textColor=INK),
        "cover_meta": ParagraphStyle("SanaqCoverMeta", parent=sample["BodyText"], fontName=font_bold, fontSize=9, leading=13, textColor=LAVENDER, alignment=TA_CENTER),
    }


def _bullet(text, style, color=LAVENDER):
    return Paragraph(f'<font color="{color.hexval()}">●</font>&nbsp;&nbsp;{_safe(text)}', style)


def _section_card(title, body, styles, background=STONE_LIGHT):
    content = [[Paragraph(_safe(title), styles["h2"])], [Paragraph(_safe(body), styles["body"])]]
    table = Table(content, colWidths=[166 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#E4E1DB")),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def _lesson_pages(guide, styles):
    story = []

    # Page 1: cover and learning contract.
    story.extend([
        Spacer(1, 10 * mm),
        Paragraph(f"{guide['grade']} класс · {_safe(guide['subject'])}", styles["cover_meta"]),
        Spacer(1, 8 * mm),
        Paragraph(_safe(guide["title"]), styles["title"]),
        Paragraph(_safe(guide["intro"]), styles["body"]),
        Spacer(1, 5 * mm),
        _section_card("Ученик", "Имя: ____________________________________    Дата: __________________", styles, colors.white),
        Spacer(1, 5 * mm),
        Paragraph("После урока я смогу", styles["h2"]),
        *[_bullet(item, styles["body"]) for item in guide["objectives"][:4]],
        Spacer(1, 5 * mm),
        _section_card("Маршрут воркбука", "1. Понять идею  →  2. Разобрать примеры  →  3. Решить самостоятельно  →  4. Проверить себя", styles, MINT),
        Spacer(1, 5 * mm),
        Paragraph(f"Ориентир по времени: {guide['estimated_minutes']} минут. Можно остановиться после любой страницы и продолжить позже.", styles["small"]),
        PageBreak(),
    ])

    # Page 2: theory and method.
    story.append(Paragraph("Теория без лишней воды", styles["page_title"]))
    concept, algorithm, warnings = guide["sections"]
    story.extend([
        Paragraph(_safe(concept["title"]), styles["h2"]),
        Paragraph(_safe(concept["body"]), styles["body"]),
        Paragraph(_safe(concept["callout"]), styles["callout"]),
        Paragraph(_safe(algorithm["title"]), styles["h2"]),
        Paragraph(f'<font color="#FFFFFF">{_safe(algorithm["body"])}</font>', styles["formula"]),
        *[_bullet(item, styles["body"], MINT_DARK) for item in algorithm["items"]],
        Spacer(1, 2 * mm),
        Paragraph(_safe(warnings["title"]), styles["h2"]),
        *[_bullet(item, styles["small"], colors.HexColor("#D96552")) for item in warnings["items"]],
        PageBreak(),
    ])

    # Page 3: worked examples.
    story.append(Paragraph("Разобранные примеры", styles["page_title"]))
    examples = guide["examples"] or [{"title": "Разобранный пример", "problem": guide["title"], "steps": [guide["reflection"]], "answer": ""}]
    for example in examples[:3]:
        rows = [
            [Paragraph(_safe(example["title"]), styles["h2"])],
            [Paragraph(f"<b>Условие:</b> {_safe(example['problem'])}", styles["body"])],
            [Paragraph("<br/>".join(f"{index}. {_safe(step)}" for index, step in enumerate(example["steps"], 1)), styles["small"])],
            [Paragraph(f"<b>Ответ:</b> {_safe(example['answer'])}", styles["body"])],
        ]
        card = Table(rows, colWidths=[166 * mm])
        card.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.8, LAVENDER_LIGHT),
            ("LEFTPADDING", (0, 0), (-1, -1), 11), ("RIGHTPADDING", (0, 0), (-1, -1), 11),
            ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.extend([KeepTogether(card), Spacer(1, 4 * mm)])
    story.append(PageBreak())

    # Page 4: independent practice.
    story.extend([
        Paragraph("Теперь реши сам", styles["page_title"]),
        Paragraph("Пиши преобразования по строкам. Если застрял, вернись к алгоритму на странице 2.", styles["small"]),
        Spacer(1, 4 * mm),
    ])
    for item in guide["practice"][:6]:
        task = Table([
            [Paragraph(f"<b>{item['number']}.</b> {_safe(item['prompt'])}", styles["task"])],
            [Paragraph("Решение: ______________________________________________________________<br/>_______________________________________________________________________", styles["small"])],
        ], colWidths=[166 * mm])
        task.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#DDD9D2")),
            ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.extend([KeepTogether(task), Spacer(1, 2.5 * mm)])
    story.append(PageBreak())

    # Page 5: answer key, reflection, and offline handoff.
    story.extend([
        Paragraph("Проверка и рефлексия", styles["page_title"]),
        Paragraph("Сначала завершите все решения на странице 4 и только потом открывайте этот блок.", styles["callout"]),
        Paragraph("Короткие ответы", styles["h2"]),
    ])
    answers = []
    for item in guide["practice"][:6]:
        answer = item["answer"] or "Ответ зависит от составленного примера; проверьте все шаги по алгоритму."
        answers.append([Paragraph(f"<b>{item['number']}.</b>", styles["small"]), Paragraph(_safe(answer), styles["small"])])
    answer_table = Table(answers, colWidths=[12 * mm, 154 * mm])
    answer_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), STONE_LIGHT),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#DDD9D2")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([
        answer_table,
        Spacer(1, 6 * mm),
        Paragraph("Объясни идею", styles["h2"]),
        Paragraph(_safe(guide["reflection"]), styles["body"]),
        Paragraph("______________________________________________________________________________<br/>______________________________________________________________________________", styles["small"]),
        Spacer(1, 5 * mm),
        _section_card("Самопроверка", "□ Я назвал правило.    □ Показал шаги.    □ Проверил ответ.    □ Отметил вопрос учителю.", styles, MINT),
        Spacer(1, 4 * mm),
        Paragraph("Вернитесь в SANAQ, чтобы выполнить интерактивную практику: результат обновит карту знаний и персональный маршрут.", styles["small"]),
    ])
    return story


def render_workbook(module, lessons, locale="ru"):
    """Render one five-page workbook per lesson and return PDF bytes."""
    font_regular, font_bold = _register_fonts()
    styles = _styles(font_regular, font_bold)
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=28 * mm,
        bottomMargin=18 * mm,
        title=_clean(localized(module.title, locale)),
        author="SANAQ · ITshechka",
        subject="Персональный учебный воркбук",
    )
    story = []
    for index, lesson in enumerate(lessons):
        if index:
            story.append(PageBreak())
        guide = build_lesson_guide(module, lesson, locale=locale)
        story.extend(_lesson_pages(guide, styles))
    decorator = _page_decorator(font_regular, font_bold)
    document.build(story, onFirstPage=decorator, onLaterPages=decorator)
    return buffer.getvalue()
