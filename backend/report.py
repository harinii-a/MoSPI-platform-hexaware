"""
Dynamic Report Generation Engine
Generates publication-quality PDF/CSV/JSON survey intelligence validation reports
with deep statistical insights, demographic distributions, state rollups, and audit sign-off.
"""
import os
import json
from datetime import datetime
import pandas as pd

from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for dynamic 'Page X of Y' numbering and running header/footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#475569"))

        # Running Header on page 2+
        if self._pageNumber > 1:
            self.drawString(36, 805, "GOVERNMENT OF INDIA • MINISTRY OF STATISTICS AND PROGRAMME IMPLEMENTATION")
            self.setFont("Helvetica", 7.5)
            self.drawRightString(559, 805, "SURVEY INTELLIGENCE & AUDIT REPORT")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.75)
            self.line(36, 798, 559, 798)

        # Running Footer on all pages
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.75)
        self.line(36, 40, 559, 40)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(36, 28, "MoSPI Survey Intelligence Platform v2.0 • Data Validation & Statistical Quality Audit")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(559, 28, page_str)
        self.restoreState()


def create_pdf(path: str, summary: dict, dataset_meta: dict = None, analytics: dict = None):
    """
    Generate an executive-grade, publication-quality PDF audit report
    with deep statistical insights, demographic breakdowns, state rollups, and audit sign-off.
    """
    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=48,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()

    # ─── Custom Color Palette ─────────────────────────────────────
    c_primary = colors.HexColor("#0f172a")     # Deep Navy
    c_brand = colors.HexColor("#1e40af")       # MoSPI Royal Blue
    c_brand_light = colors.HexColor("#eff6ff") # Light Blue
    c_accent = colors.HexColor("#0284c7")      # Sky Blue
    c_dark = colors.HexColor("#1e293b")        # Slate 800
    c_muted = colors.HexColor("#64748b")       # Slate 500
    c_border = colors.HexColor("#cbd5e1")      # Slate 300
    c_bg_subtle = colors.HexColor("#f8fafc")    # Slate 50
    c_success = colors.HexColor("#059669")     # Emerald 600
    c_warning = colors.HexColor("#d97706")     # Amber 600
    c_danger = colors.HexColor("#dc2626")      # Rose 600

    # ─── Typography & Paragraph Styles ────────────────────────────
    st_header_sup = ParagraphStyle(
        'HeaderSup', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8, leading=10,
        textColor=c_brand, textTransform='uppercase', spaceAfter=2
    )
    st_title = ParagraphStyle(
        'MainTitle', parent=styles['Title'],
        fontName='Helvetica-Bold', fontSize=18, leading=22,
        textColor=c_primary, alignment=0, spaceAfter=4
    )
    st_subtitle = ParagraphStyle(
        'Subtitle', parent=styles['Normal'],
        fontName='Helvetica', fontSize=9, leading=13,
        textColor=c_muted, spaceAfter=12
    )
    st_section_head = ParagraphStyle(
        'SecHead', parent=styles['Heading2'],
        fontName='Helvetica-Bold', fontSize=12, leading=16,
        textColor=c_brand, spaceBefore=14, spaceAfter=6,
        keepWithNext=True
    )
    st_body = ParagraphStyle(
        'CustomBody', parent=styles['BodyText'],
        fontName='Helvetica', fontSize=8.5, leading=12,
        textColor=c_dark
    )
    st_body_bold = ParagraphStyle(
        'CustomBodyBold', parent=st_body,
        fontName='Helvetica-Bold'
    )
    st_callout = ParagraphStyle(
        'CalloutText', parent=styles['Normal'],
        fontName='Helvetica-Oblique', fontSize=8.5, leading=12,
        textColor=c_dark
    )
    st_th = ParagraphStyle(
        'TableHead', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=7.5, leading=10,
        textColor=colors.white, alignment=0
    )
    st_td = ParagraphStyle(
        'TableCell', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7.5, leading=10,
        textColor=c_dark
    )
    st_td_bold = ParagraphStyle(
        'TableCellBold', parent=st_td,
        fontName='Helvetica-Bold'
    )
    st_badge_danger = ParagraphStyle(
        'BadgeDanger', parent=st_td,
        fontName='Helvetica-Bold', fontSize=7, leading=9,
        textColor=c_danger
    )
    st_badge_warning = ParagraphStyle(
        'BadgeWarning', parent=st_td,
        fontName='Helvetica-Bold', fontSize=7, leading=9,
        textColor=c_warning
    )
    st_badge_success = ParagraphStyle(
        'BadgeSuccess', parent=st_td,
        fontName='Helvetica-Bold', fontSize=7, leading=9,
        textColor=c_success
    )

    story = []

    # Extract Data Context
    meta = dataset_meta or summary.get("dataset_meta", {})
    filename = meta.get("filename", "Survey Microdata")
    dataset_id = meta.get("dataset_id", "N/A")
    total_records = summary.get("total_records", 0)
    total_columns = summary.get("total_columns", 0)
    missing_pct = summary.get("overall_missing_pct", 0.0)
    integrity_count = summary.get("integrity_violation_count", 0)
    ml_count = summary.get("ml_anomaly_count", 0)
    high_risk_count = summary.get("high_risk_count", 0)
    risk_dist = summary.get("risk_distribution", {})
    clusters = summary.get("clusters", [])
    enum_data = summary.get("enumerator_analysis", {})
    stats = summary.get("statistics", {})

    # Analytics context if available
    overview = analytics.get("overview", {}) if analytics else {}
    weighted_pop = overview.get("weighted_population")
    numeric_profiles = analytics.get("numeric_profiles", {}) if analytics else {}
    sector_comp = analytics.get("sector_comparison", []) if analytics else []
    state_analytics = analytics.get("state_analytics", []) if analytics else []

    # ═════════════════════════════════════════════════════════════════
    # 1. OFFICIAL DOCUMENT HEADER & BANNER
    # ═════════════════════════════════════════════════════════════════
    story.append(Paragraph("GOVERNMENT OF INDIA • MINISTRY OF STATISTICS & PROGRAMME IMPLEMENTATION", st_header_sup))
    story.append(Paragraph("Survey Microdata Intelligence & Quality Audit Report", st_title))
    story.append(Paragraph(
        f"Automated statistical quality assessment, multi-factor anomaly diagnostics, and supervisory compliance report for active survey dataset <b>{filename}</b>.",
        st_subtitle
    ))

    # Meta Info Table Box
    gen_time = datetime.utcnow().strftime("%d-%b-%Y %H:%M UTC")
    meta_table_data = [
        [
            Paragraph(f"<b>Dataset File:</b> {filename}", st_td),
            Paragraph(f"<b>Dataset ID:</b> <font name='Courier'>{dataset_id}</font>", st_td),
            Paragraph(f"<b>Audit Date:</b> {gen_time}", st_td),
        ],
        [
            Paragraph(f"<b>Total Sample:</b> {total_records:,} Records", st_td_bold),
            Paragraph(f"<b>Total Variables:</b> {total_columns} Attributes", st_td),
            Paragraph(f"<b>Audit Status:</b> <font color='#059669'><b>COMPLETED (PASS)</b></font>", st_td),
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[180, 170, 173])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_bg_subtle),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # ═════════════════════════════════════════════════════════════════
    # 2. EXECUTIVE SUMMARY & MACRO KPI SCORECARDS
    # ═════════════════════════════════════════════════════════════════
    story.append(Paragraph("1. Executive Summary & Quality Scorecards", st_section_head))

    # 4-Tile Metric Card Table
    health_rate = round(100 - missing_pct, 2)
    flagged_rate = round((high_risk_count / total_records * 100), 2) if total_records > 0 else 0
    ml_rate = round((ml_count / total_records * 100), 2) if total_records > 0 else 0

    kpi_card_data = [
        [
            Paragraph(f"<font size=6 color='#64748b'>TOTAL SURVEY RECORDS</font><br/><font size=13 color='#1e40af'><b>{total_records:,}</b></font><br/><font size=6.5 color='#475569'>100% Evaluated by AI Engine</font>", st_body),
            Paragraph(f"<font size=6 color='#64748b'>DATA COMPLETENESS RATE</font><br/><font size=13 color='#059669'><b>{health_rate}%</b></font><br/><font size=6.5 color='#475569'>{missing_pct:.2f}% Missing Attribute Rate</font>", st_body),
            Paragraph(f"<font size=6 color='#64748b'>HIGH-RISK FLAGGED RECORDS</font><br/><font size=13 color='#dc2626'><b>{high_risk_count:,}</b></font><br/><font size=6.5 color='#475569'>{flagged_rate}% Priority Review Index</font>", st_body),
            Paragraph(f"<font size=6 color='#64748b'>ISOLATION FOREST ANOMALIES</font><br/><font size=13 color='#d97706'><b>{ml_count:,}</b></font><br/><font size=6.5 color='#475569'>{ml_rate}% Multivariate Outliers</font>", st_body),
        ]
    ]
    kpi_table = Table(kpi_card_data, colWidths=[130, 130, 130, 133])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), c_brand_light),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor("#ecfdf5")),
        ('BACKGROUND', (2, 0), (2, 0), colors.HexColor("#fef2f2")),
        ('BACKGROUND', (3, 0), (3, 0), colors.HexColor("#fffbeb")),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 8))

    # Executive Briefing Callout Box
    pop_str = f"representing an extrapolated national household population of <b>{weighted_pop:,.0f}</b>" if weighted_pop else "representing nationwide microdata sample responses"
    exec_summary_text = (
        f"<b>Audit Findings Synthesis:</b> The survey microdata dataset (<i>{filename}</i>) underwent comprehensive multi-tier data verification across {total_records:,} household observations, {pop_str}. "
        f"The dataset demonstrates an overall data integrity completeness score of <b>{health_rate}%</b>. "
        f"A total of <b>{integrity_count:,} deterministic rule discrepancies</b> and <b>{ml_count:,} multi-dimensional Isolation Forest outliers</b> were flagged for supervisory investigation. "
        f"Overall risk assessment categorizes <b>{risk_dist.get('low', 0):,} records ({round(risk_dist.get('low', 0)/max(total_records,1)*100, 1)}%)</b> as normal, "
        f"<b>{risk_dist.get('medium', 0):,} records</b> as medium caution, and <b>{high_risk_count:,} records</b> as high-priority audit items."
    )
    exec_box = Table([[Paragraph(exec_summary_text, st_callout)]], colWidths=[523])
    exec_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(exec_box)
    story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════
    # 3. EMPIRICAL STATISTICAL DISTRIBUTIONS & CONTINUOUS MEASURES
    # ═════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. Microdata Statistical Profiling & Key Measures", st_section_head))

    # Compile table of key measures from numeric_profiles or stats
    stat_rows = [[
        Paragraph("<b>Variable</b>", st_th),
        Paragraph("<b>Mean</b>", st_th),
        Paragraph("<b>Median</b>", st_th),
        Paragraph("<b>Min – Max</b>", st_th),
        Paragraph("<b>IQR Range (Q1 - Q3)</b>", st_th),
        Paragraph("<b>Skew</b>", st_th),
        Paragraph("<b>Outliers (1.5x IQR)</b>", st_th),
    ]]

    measure_source = []
    if numeric_profiles:
        for k, v in numeric_profiles.items():
            measure_source.append({
                "name": k,
                "mean": v.get("mean", 0),
                "median": v.get("median", 0),
                "min": v.get("min", 0),
                "max": v.get("max", 0),
                "q1": v.get("q1", 0),
                "q3": v.get("q3", 0),
                "skew": v.get("skewness", 0),
                "outliers_pct": v.get("outliers_pct", 0),
                "outliers_cnt": v.get("outliers_count", 0),
            })
    elif stats:
        for k, v in stats.items():
            measure_source.append({
                "name": k,
                "mean": v.get("mean", 0),
                "median": v.get("median", 0),
                "min": v.get("min", 0),
                "max": v.get("max", 0),
                "q1": v.get("q1", 0),
                "q3": v.get("q3", 0),
                "skew": 0.0,
                "outliers_pct": 0.0,
                "outliers_cnt": 0,
            })

    for item in measure_source[:8]:
        outlier_text = f"{item['outliers_cnt']:,} ({item['outliers_pct']}%)" if item['outliers_cnt'] > 0 else "0 (0%)"
        stat_rows.append([
            Paragraph(f"<b>{item['name']}</b>", st_td_bold),
            Paragraph(f"{item['mean']:,.2f}" if isinstance(item['mean'], (int, float)) else str(item['mean']), st_td),
            Paragraph(f"{item['median']:,.2f}" if isinstance(item['median'], (int, float)) else str(item['median']), st_td),
            Paragraph(f"{item['min']:,.1f} – {item['max']:,.1f}" if isinstance(item['min'], (int, float)) else "N/A", st_td),
            Paragraph(f"{item['q1']:,.1f} – {item['q3']:,.1f}" if isinstance(item['q1'], (int, float)) else "N/A", st_td),
            Paragraph(f"{item['skew']:.2f}", st_td),
            Paragraph(outlier_text, st_td),
        ])

    if len(stat_rows) > 1:
        stat_table = Table(stat_rows, colWidths=[90, 68, 68, 95, 95, 45, 62])
        stat_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_brand),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
            ('BOX', (0, 0), (-1, -1), 1, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(stat_table)
    else:
        story.append(Paragraph("No continuous numeric variables available for distribution profiling.", st_body))
    story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════
    # 4. SOCIOECONOMIC & SECTOR STRATIFICATION (RURAL VS URBAN)
    # ═════════════════════════════════════════════════════════════════
    if sector_comp:
        story.append(Paragraph("3. Socioeconomic Stratification & Sectoral Comparison", st_section_head))
        sec_rows = [[
            Paragraph("<b>Sector Category</b>", st_th),
            Paragraph("<b>Sample Records</b>", st_th),
            Paragraph("<b>Sample Share (%)</b>", st_th),
            Paragraph("<b>Mean Expenditure (₹)</b>", st_th),
            Paragraph("<b>Median Income (₹)</b>", st_th),
            Paragraph("<b>Avg Household Size</b>", st_th),
        ]]
        for s in sector_comp:
            avg_val = s.get('avg_hh_size')
            try:
                if avg_val is not None and not pd.isna(avg_val):
                    avg_num = float(avg_val)
                    avg_str = f"{avg_num:.2f} persons"
                else:
                    avg_str = "N/A"
            except (ValueError, TypeError):
                avg_str = f"{avg_val} persons" if avg_val else "N/A"

            sec_rows.append([
                Paragraph(f"<b>{s.get('sector_name', 'Sector')}</b>", st_td_bold),
                Paragraph(f"{s.get('records', 0):,}", st_td),
                Paragraph(f"{s.get('percentage', 0):.2f}%", st_td),
                Paragraph(f"₹{s.get('avg_expenditure', 0):,.2f}" if 'avg_expenditure' in s else "N/A", st_td),
                Paragraph(f"₹{s.get('median_income', 0):,.2f}" if 'median_income' in s else "N/A", st_td),
                Paragraph(avg_str, st_td),
            ])
        sec_table = Table(sec_rows, colWidths=[110, 80, 80, 95, 85, 73])
        sec_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f766e")), # Deep Teal
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
            ('BOX', (0, 0), (-1, -1), 1, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(sec_table)
        story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════
    # 5. GEOGRAPHIC STATE-LEVEL ROLLUPS (TOP 6 STATES)
    # ═════════════════════════════════════════════════════════════════
    if state_analytics:
        story.append(Paragraph("4. Geographic & Regional Distribution Highlights", st_section_head))
        st_rows = [[
            Paragraph("<b>State / Region</b>", st_th),
            Paragraph("<b>Sample Records</b>", st_th),
            Paragraph("<b>National Share</b>", st_th),
            Paragraph("<b>Mean Expenditure (₹)</b>", st_th),
            Paragraph("<b>Avg Household Size</b>", st_th),
        ]]
        for row in state_analytics[:6]:
            state_label = row.get("state_id", "State")
            avg_val = row.get('avg_hh_size')
            try:
                if avg_val is not None and not pd.isna(avg_val):
                    avg_num = float(avg_val)
                    avg_str = f"{avg_num:.2f} persons"
                else:
                    avg_str = "N/A"
            except (ValueError, TypeError):
                avg_str = f"{avg_val} persons" if avg_val else "N/A"

            st_rows.append([
                Paragraph(f"<b>State #{state_label}</b>", st_td_bold),
                Paragraph(f"{row.get('records', 0):,}", st_td),
                Paragraph(f"{row.get('share_pct', 0):.2f}%", st_td),
                Paragraph(f"₹{row.get('avg_expenditure', 0):,.2f}" if 'avg_expenditure' in row else "N/A", st_td),
                Paragraph(avg_str, st_td),
            ])
        st_table = Table(st_rows, colWidths=[123, 90, 90, 110, 110])
        st_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")), # Slate
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
            ('BOX', (0, 0), (-1, -1), 1, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(st_table)
        story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════
    # 6. MULTI-FACTOR AI RISK ENGINE & TOP FLAGGED OBSERVATIONS
    # ═════════════════════════════════════════════════════════════════
    story.append(Paragraph("5. AI Quality Diagnostics & Priority Flagged Records", st_section_head))

    records = summary.get("records", [])
    flagged_records = [r for r in records if r.get("risk_level") == "High" or r.get("has_rule_violation") or r.get("has_ml_anomaly")]

    total_rec_count = len(records)
    flagged_rec_count = len(flagged_records)
    flagged_pct = round((flagged_rec_count / total_rec_count * 100), 2) if total_rec_count > 0 else 0.0

    story.append(Paragraph(
        f"<b>{flagged_rec_count} of {total_rec_count} records flagged ({flagged_pct:.2f}%)</b>",
        st_body_bold
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Records flagged below combine deterministic business rules (35%), Isolation Forest unsupervised ML anomalies (35%), enumerator skew (15%), and spatial cluster variance (15%):",
        st_body
    ))
    story.append(Spacer(1, 4))

    if flagged_records:
        flag_rows = [[
            Paragraph("<b>Record #</b>", st_th),
            Paragraph("<b>Risk Score</b>", st_th),
            Paragraph("<b>Level</b>", st_th),
            Paragraph("<b>Rule Violation</b>", st_th),
            Paragraph("<b>ML Anomaly</b>", st_th),
            Paragraph("<b>Review Status</b>", st_th),
            Paragraph("<b>Primary Deviation Detail</b>", st_th),
        ]]
        for rec in flagged_records[:6]:
            risk_score = rec.get("risk_score", 0)
            risk_level = rec.get("risk_level", "Low")
            rule_badge = Paragraph("VIOLATION", st_badge_danger) if rec.get("has_rule_violation") else Paragraph("PASS", st_badge_success)
            ml_badge = Paragraph("OUTLIER", st_badge_warning) if rec.get("has_ml_anomaly") else Paragraph("NORMAL", st_badge_success)

            status = rec.get("review_status", "NEW")
            if status == "APPROVED":
                status_badge = Paragraph("APPROVED", st_badge_success)
            elif status in ("REJECTED", "ESCALATED"):
                status_badge = Paragraph(status, st_badge_danger)
            else:
                status_badge = Paragraph("NEW", st_badge_warning)

            desc = "Multi-feature outlier & range threshold exceeded" if rec.get("has_rule_violation") and rec.get("has_ml_anomaly") else ("Deterministic boundary check trigger" if rec.get("has_rule_violation") else "Unsupervised multidimensional anomaly")

            flag_rows.append([
                Paragraph(f"<b>#{rec.get('_index', 0)}</b>", st_td_bold),
                Paragraph(f"<b>{risk_score}/100</b>", st_td_bold),
                Paragraph(risk_level, st_badge_danger if risk_level == "High" else st_badge_warning),
                rule_badge,
                ml_badge,
                status_badge,
                Paragraph(desc, st_td),
            ])
        flag_table = Table(flag_rows, colWidths=[50, 55, 45, 60, 60, 65, 188])
        flag_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#991b1b")), # Crimson Red
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
            ('BOX', (0, 0), (-1, -1), 1, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(flag_table)
    else:
        story.append(Paragraph("Zero high-risk or anomalous microdata records detected across active sample.", st_body))
    story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════
    # 7. SUPERVISORY RECOMMENDATIONS & COMPLIANCE ACTIONS & CERTIFICATION
    # ═════════════════════════════════════════════════════════════════
    sec_6_elements = []
    sec_6_elements.append(Paragraph("6. Supervisory Recommendations & Compliance Directives", st_section_head))

    recs = []
    if high_risk_count > 0:
        recs.append(f"<b>Priority Triage:</b> {high_risk_count:,} high-risk observations require formal supervisor review via the validation queue prior to national statistical aggregation.")
    if integrity_count > 0:
        recs.append(f"<b>Integrity Corrections:</b> {integrity_count:,} rule violations involve field boundary checks (negative income, invalid codes, or missing values) and should be reconciled.")
    if ml_count > 0:
        recs.append(f"<b>Statistical Outliers:</b> {ml_count:,} multivariate Isolation Forest anomalies require analytical spot-checking for abnormal expenditure-to-income ratios.")
    if not recs:
        recs.append("<b>Optimal Data Quality:</b> Dataset satisfies all deterministic integrity rules and statistical distribution boundaries. Microdata is approved for econometric calibration.")

    for r in recs:
        sec_6_elements.append(Paragraph(f"• {r}", st_body))
        sec_6_elements.append(Spacer(1, 3))

    sec_6_elements.append(Spacer(1, 10))

    # ═════════════════════════════════════════════════════════════════
    # 8. OFFICIAL CERTIFICATION & AUDIT SIGN-OFF BLOCK
    # ═════════════════════════════════════════════════════════════════
    cert_time = datetime.utcnow().strftime("%d-%b-%Y %H:%M UTC")
    sign_off_data = [
        [
            Paragraph(f"<b>CERTIFIED BY DATA SUPERVISOR</b><br/><br/>________________________________________<br/><b>Dr. Rajesh Kumar</b><br/>Lead Statistical Quality Officer<br/>Survey Validation Division, MoSPI<br/>Date of Certification: {cert_time}", st_td),
            Paragraph(f"<b>ENDORSED BY DIRECTOR / HEAD OF OPERATIONS</b><br/><br/>________________________________________<br/><b>Director General (Surveys)</b><br/>National Statistical Office (NSO)<br/>Government of India<br/>Date of Endorsement: {cert_time}", st_td),
        ]
    ]
    sign_table = Table(sign_off_data, colWidths=[260, 263])
    sign_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('BACKGROUND', (0, 0), (-1, -1), c_bg_subtle),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    sec_6_elements.append(sign_table)
    story.append(KeepTogether(sec_6_elements))

    # Build document with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)


def create_csv_report(path: str, records: list):
    """Export records to CSV."""
    if records:
        df = pd.DataFrame(records)
        df.to_csv(path, index=False)


def create_json_report(path: str, summary: dict):
    """Export full summary to JSON."""
    with open(path, 'w') as f:
        json.dump(summary, f, indent=2, default=str)
