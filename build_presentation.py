import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_paths):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Theme Colors
    BG_DARK = RGBColor(10, 15, 29)        # #0A0F1D
    CARD_BG = RGBColor(19, 27, 46)        # #131B2E
    CARD_BORDER = RGBColor(30, 41, 59)    # #1E293B
    CYAN = RGBColor(56, 189, 248)         # #38BDF8
    BLUE = RGBColor(37, 99, 235)          # #2563EB
    TEXT_WHITE = RGBColor(248, 250, 252)  # #F8FAFC
    TEXT_MUTED = RGBColor(148, 163, 184)  # #94A3B8
    GREEN = RGBColor(34, 197, 94)         # #22C55E
    YELLOW = RGBColor(245, 158, 11)       # #F59E0B
    RED = RGBColor(239, 68, 68)           # #EF4444

    def fill_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background()
        return bg

    def add_header(slide, tag_text, title_text, subtitle_text=""):
        # Header Tag
        tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(8), Inches(0.4))
        tf_tag = tag_box.text_frame
        tf_tag.word_wrap = True
        tf_tag.margin_left = tf_tag.margin_top = tf_tag.margin_bottom = tf_tag.margin_right = 0
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = tag_text.upper()
        p_tag.font.name = "Segoe UI"
        p_tag.font.size = Pt(11)
        p_tag.font.bold = True
        p_tag.font.color.rgb = CYAN

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.5), Inches(0.6))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        tf_title.margin_left = tf_title.margin_top = tf_title.margin_bottom = tf_title.margin_right = 0
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.name = "Segoe UI"
        p_title.font.size = Pt(26)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_WHITE

        # Subtitle
        if subtitle_text:
            sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.35), Inches(11.5), Inches(0.5))
            tf_sub = sub_box.text_frame
            tf_sub.word_wrap = True
            tf_sub.margin_left = tf_sub.margin_top = tf_sub.margin_bottom = tf_sub.margin_right = 0
            p_sub = tf_sub.paragraphs[0]
            p_sub.text = subtitle_text
            p_sub.font.name = "Segoe UI"
            p_sub.font.size = Pt(13)
            p_sub.font.color.rgb = TEXT_MUTED

    def add_split_slide(tag, title, subtitle, bullets, img_path, img_caption=""):
        slide = prs.slides.add_slide(blank_layout)
        fill_bg(slide)
        add_header(slide, tag, title, subtitle)

        # Left Card (Content)
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.9), Inches(5.6), Inches(5.0))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1)

        tx_box = slide.shapes.add_textbox(Inches(1.0), Inches(2.1), Inches(5.2), Inches(4.6))
        tf = tx_box.text_frame
        tf.word_wrap = True

        for i, item in enumerate(bullets):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.space_after = Pt(12)
            p.font.name = "Segoe UI"
            p.font.size = Pt(13)
            p.font.color.rgb = RGBColor(203, 213, 225)
            
            # Format title and description
            if ":" in item:
                title_part, desc_part = item.split(":", 1)
                r_title = p.add_run()
                r_title.text = title_part + ":"
                r_title.font.bold = True
                r_title.font.color.rgb = TEXT_WHITE
                r_desc = p.add_run()
                r_desc.text = desc_part
            else:
                r = p.add_run()
                r.text = item

        # Right Card (Screenshot)
        img_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.7), Inches(1.9), Inches(5.8), Inches(5.0))
        img_card.fill.solid()
        img_card.fill.fore_color.rgb = RGBColor(5, 8, 16)
        img_card.line.color.rgb = CARD_BORDER
        img_card.line.width = Pt(1)

        if os.path.exists(img_path):
            slide.shapes.add_picture(img_path, Inches(6.8), Inches(2.0), width=Inches(5.6))
        
        if img_caption:
            cap_box = slide.shapes.add_textbox(Inches(6.8), Inches(6.55), Inches(5.6), Inches(0.3))
            tf_cap = cap_box.text_frame
            tf_cap.word_wrap = True
            p_cap = tf_cap.paragraphs[0]
            p_cap.text = img_caption
            p_cap.alignment = PP_ALIGN.CENTER
            p_cap.font.name = "Segoe UI"
            p_cap.font.size = Pt(10)
            p_cap.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 1: TITLE SLIDE
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    fill_bg(s1)

    # Accent decorative card
    decor = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.0), Inches(11.733), Inches(5.5))
    decor.fill.solid()
    decor.fill.fore_color.rgb = CARD_BG
    decor.line.color.rgb = CARD_BORDER
    decor.line.width = Pt(1.5)

    # Title badge
    tb = s1.shapes.add_textbox(Inches(1.3), Inches(1.5), Inches(8), Inches(0.5))
    p = tb.text_frame.paragraphs[0]
    p.text = "FINANCIAL SECURITY PLATFORM"
    p.font.name = "Segoe UI"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = CYAN

    # Big Title
    t_box = s1.shapes.add_textbox(Inches(1.3), Inches(2.1), Inches(10.5), Inches(1.5))
    p = t_box.text_frame.paragraphs[0]
    p.text = "FraudGuard AI"
    p.font.name = "Segoe UI"
    p.font.size = Pt(46)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE

    p2 = t_box.text_frame.add_paragraph()
    p2.text = "AI-Powered Real-Time Fraud Detection & Compliance System"
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(22)
    p2.font.color.rgb = CYAN
    p2.space_before = Pt(8)

    # Summary bullet points in hero
    hero_box = s1.shapes.add_textbox(Inches(1.3), Inches(4.0), Inches(10.5), Inches(1.2))
    tf_hero = hero_box.text_frame
    bullets_s1 = [
        "🛡️ Real-time transactional risk scoring (0-100) with sub-second latency.",
        "⚡ Multi-vector anomaly heuristics: amount velocity, cross-border locations, channel deviations.",
        "🗄️ Production full-stack architecture: Spring Boot 4.1 + MySQL 8.0 + Modern Web UI."
    ]
    for i, b in enumerate(bullets_s1):
        p = tf_hero.paragraphs[0] if i == 0 else tf_hero.add_paragraph()
        p.text = b
        p.font.name = "Segoe UI"
        p.font.size = Pt(14)
        p.font.color.rgb = RGBColor(226, 232, 240)
        p.space_after = Pt(6)

    # Presenter info
    author_box = s1.shapes.add_textbox(Inches(1.3), Inches(5.4), Inches(8), Inches(0.5))
    p = author_box.text_frame.paragraphs[0]
    p.text = "Author: Kritika Perti  |  Date: October 2026  |  GitHub: kritikaperti/AI-POWERED-FRAUD-DETECTION"
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 2: EXECUTIVE SUMMARY & LANDING
    # ==========================================
    add_split_slide(
        "EXECUTIVE SUMMARY",
        "Problem Statement & Proposed Solution",
        "Modern digital payments require sub-second transaction evaluation without customer friction.",
        [
            "Financial Risk Surge: High volume of automated online fraud, chargebacks, and account takeovers requires real-time interception.",
            "Legacy Bottlenecks: Traditional batch fraud analysis is too slow and lacks actionable explainability.",
            "FraudGuard Solution: Combines deterministic thresholds with probabilistic risk scoring (0 to 100).",
            "Transparency by Design: Delivers clear natural-language justifications for every flagged or blocked payment.",
            "Dual Operation Mode: Connected live Spring Boot REST API mode + offline client-side fallback simulation."
        ],
        "docs/screenshots/landing.png",
        "Figure 1: FraudGuard Landing Page with Real-Time Security Health Meter"
    )

    # ==========================================
    # SLIDE 3: SYSTEM ARCHITECTURE & TECH STACK
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    fill_bg(s3)
    add_header(s3, "SYSTEM ARCHITECTURE", "End-to-End Multi-Tier Architecture", "Clean separation of presentation, security services, intelligence engine, and relational storage.")

    # 3 Cards Layout
    col_w = Inches(3.64)
    gap = Inches(0.4)
    y_pos = Inches(2.0)
    h_pos = Inches(4.8)

    cards = [
        {
            "tag": "PRESENTATION TIER",
            "title": "Modern Web UI",
            "color": CYAN,
            "tech": "HTML5 • CSS3 • JavaScript (ES6+)",
            "points": [
                "Responsive fintech user experience",
                "SVG dynamic risk gauges and meters",
                "Instant transaction testing interface",
                "Searchable historical ledgers",
                "Automatic localStorage fallback"
            ]
        },
        {
            "tag": "SERVICE & API TIER",
            "title": "Spring Boot 4.1",
            "color": GREEN,
            "tech": "Java 26 • Spring Security 6 • JWT",
            "points": [
                "Stateless REST controllers",
                "BCrypt salt-hashed credentials",
                "Role-Based Access Control (RBAC)",
                "Heuristic Fraud Scoring Engine",
                "Tomcat web container on port 8080"
            ]
        },
        {
            "tag": "PERSISTENCE TIER",
            "title": "MySQL 8.0 Database",
            "color": YELLOW,
            "tech": "JPA / Hibernate 7.4 • InnoDB",
            "points": [
                "ACID compliant transactional storage",
                "Relational schema: users, txns, cases",
                "1:1 foreign keys for investigations",
                "Automatic Hibernate schema updates",
                "Pre-seeded with admin credentials"
            ]
        }
    ]

    for i, c in enumerate(cards):
        x = Inches(0.8) + i * (col_w + gap)
        card = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y_pos, col_w, h_pos)
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1)

        tx = s3.shapes.add_textbox(x + Inches(0.25), y_pos + Inches(0.25), col_w - Inches(0.5), h_pos - Inches(0.5))
        tf = tx.text_frame
        tf.word_wrap = True

        p_tag = tf.paragraphs[0]
        p_tag.text = c["tag"]
        p_tag.font.name = "Segoe UI"
        p_tag.font.size = Pt(10)
        p_tag.font.bold = True
        p_tag.font.color.rgb = c["color"]

        p_t = tf.add_paragraph()
        p_t.text = c["title"]
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(20)
        p_t.font.bold = True
        p_t.font.color.rgb = TEXT_WHITE
        p_t.space_before = Pt(4)

        p_sub = tf.add_paragraph()
        p_sub.text = c["tech"]
        p_sub.font.name = "Segoe UI"
        p_sub.font.size = Pt(11)
        p_sub.font.bold = True
        p_sub.font.color.rgb = TEXT_MUTED
        p_sub.space_after = Pt(14)

        for pt in c["points"]:
            p_pt = tf.add_paragraph()
            p_pt.text = "• " + pt
            p_pt.font.name = "Segoe UI"
            p_pt.font.size = Pt(12)
            p_pt.font.color.rgb = RGBColor(203, 213, 225)
            p_pt.space_after = Pt(6)

    # ==========================================
    # SLIDE 4: PROJECT ACHIEVEMENTS TILL NOW
    # ==========================================
    add_split_slide(
        "DEVELOPMENT PROGRESS",
        "Key Accomplishments & Milestones",
        "Major development goals accomplished across hosting, bug fixes, packaging, and version control.",
        [
            "Full Local Server Hosting: Spring Boot web server running live on port 8080 serving all frontend views and REST endpoints.",
            "Form Submission Bug Fix: Corrected form submission event handlers in transaction.html to properly trigger AI analysis.",
            "Production Executable JAR: Built and packaged self-contained fraud-detection-0.0.1-SNAPSHOT.jar with embedded Tomcat.",
            "One-Click Windows Launcher: Created run-website.bat allowing instant execution without command line dependencies.",
            "Full Engineering Documentation: Produced Architecture specs, API schemas, DB dictionary, and Deployment guides in docs/.",
            "GitHub Repository Live: Initialized Git repository, cleanly filtered build artifacts, and published to GitHub."
        ],
        "docs/screenshots/user_dashboard.png",
        "Figure 2: User Dashboard with Personal Security Health and Action Items"
    )

    # ==========================================
    # SLIDE 5: USER EXPERIENCE & FRAUD SCANNER
    # ==========================================
    add_split_slide(
        "USER EXPERIENCE (UI/UX)",
        "Real-Time AI Fraud Scanner",
        "Interactive scanning interface evaluating payment parameters and returning immediate risk decisions.",
        [
            "Interactive Input Form: Users enter transaction ID, amount, channel (Payment/Transfer/Withdrawal), location, and recipient.",
            "Real-Time Evaluation: Evaluates transaction against heuristics and returns risk classification in sub-second time.",
            "Visual Risk Progress Bar: Color-coded progress bar visually mapping the computed risk score (0 to 100).",
            "Clear Natural-Language Rationale: Explains specific trigger reasons (e.g. 'High amount >= 50,000; Location anomaly').",
            "Instant Ledger Sync: Scanned transactions are automatically persisted to MySQL and appended to transaction history."
        ],
        "docs/screenshots/fraud_scanner.png",
        "Figure 3: AI Fraud Scanner Testing Interface"
    )

    # ==========================================
    # SLIDE 6: TRANSACTION HISTORY & AUDIT LEDGER
    # ==========================================
    add_split_slide(
        "AUDIT & COMPLIANCE",
        "Historical Transaction Ledger",
        "Transparent, searchable audit trail providing users with complete transaction visibility.",
        [
            "Historical Transaction Table: Lists transaction ID, timestamp, merchant, transfer channel, and monetary value.",
            "Status Tagging: Color-coded tags distinguishing SAFE (green), SUSPICIOUS (yellow), and BLOCKED (red) events.",
            "Search & Filter: Allows instant searching by recipient name, transaction ID, or status type.",
            "Dual Database Sync: Automatically syncs with MySQL backend or falls back seamlessly to localStorage.",
            "Tamper-Evident Logs: Transaction records link directly to security case files for administrative oversight."
        ],
        "docs/screenshots/history.png",
        "Figure 4: User Transaction History & Risk Score Audit Ledger"
    )

    # ==========================================
    # SLIDE 7: ADMIN EXECUTIVE MONITORING
    # ==========================================
    add_split_slide(
        "ADMINISTRATION & GOVERNANCE",
        "Executive Dashboard & Alert Queue",
        "Centralized surveillance console designed for risk managers and compliance officers.",
        [
            "Global KPI Cards: Live metrics displaying Total Monitored Transactions, Safe Rates (96%), and Flagged Cases.",
            "Active Risk Overview: Visual donut breakdown representing current threat distribution across user accounts.",
            "Detection Engine Status: Real-time telemetry monitoring rule engine status and risk scoring uptime.",
            "Suspicious Alert Queue: Dedicated workflow allowing compliance officers to triage and resolve investigations.",
            "Role-Based Access Control: Admin routes protected by Spring Security (requires ROLE_ADMIN authorization)."
        ],
        "docs/screenshots/admin_dashboard.png",
        "Figure 5: Administrator Executive Overview & Threat Telemetry"
    )

    # ==========================================
    # SLIDE 8: SURVEILLANCE & REPORTS
    # ==========================================
    add_split_slide(
        "SURVEILLANCE & ANALYTICS",
        "Live Monitoring & Risk Reporting",
        "Continuous surveillance of bank-wide transaction streams with advanced analytics.",
        [
            "Live Transaction Feed: Displays all processed transactions across every registered account.",
            "Risk Score Filtering: Instantly isolates high-risk outliers (score >= 70) for immediate intervention.",
            "Loss Prevention Reports: Quantitative reports on financial capital saved through automated payment blocks.",
            "User Role Management: Admin UI for reviewing registered accounts and modifying roles (USER to ADMIN).",
            "Actionable Audit Logs: Immutable log records for regulatory reporting and forensic analysis."
        ],
        "docs/screenshots/admin_transactions.png",
        "Figure 6: Bank-Wide Live Transaction Monitoring Stream"
    )

    # ==========================================
    # SLIDE 9: DATABASE ARCHITECTURE & SCHEMA
    # ==========================================
    add_split_slide(
        "PERSISTENCE TIER",
        "MySQL Relational Database Overview",
        "Normalized relational database (`frauddb`) managed automatically via Spring Data JPA and Hibernate.",
        [
            "`users` Table: User profiles, security roles (ADMIN/USER), and 60-character BCrypt password hashes.",
            "`transactions` Table: Transaction ledger storing amount, recipient, channel, location, timestamp, and risk score.",
            "`fraud_cases` Table: Linked 1:1 with transactions for suspicious alerts; stores investigation notes and resolution statuses.",
            "Referential Integrity: Foreign keys ensure transactions map accurately to registered users and case records.",
            "Real Database Verification: Verified live rows across all tables in MySQL 8.0 server."
        ],
        "docs/screenshots/database_overview.png",
        "Figure 7: MySQL Database Live Inspector (users, transactions, fraud_cases)"
    )

    # ==========================================
    # SLIDE 10: SCORING ENGINE & DECISION MATRIX
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    fill_bg(s10)
    add_header(s10, "FRAUD INTELLIGENCE", "Fraud Detection Heuristics & Decision Matrix", "Weighted multi-factor anomaly calculation evaluating risk dimensions.")

    # 2 Cards Layout: Heuristics & Decision Matrix
    w_card = Inches(5.6)
    card_l = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), w_card, Inches(4.8))
    card_l.fill.solid()
    card_l.fill.fore_color.rgb = CARD_BG
    card_l.line.color.rgb = CARD_BORDER

    tx_l = s10.shapes.add_textbox(Inches(1.0), Inches(2.2), w_card - Inches(0.4), Inches(4.4))
    tf_l = tx_l.text_frame
    tf_l.word_wrap = True

    p = tf_l.paragraphs[0]
    p.text = "Risk Factor Scoring Weights"
    p.font.name = "Segoe UI"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = CYAN
    p.space_after = Pt(14)

    weights = [
        ("Base Transaction Score", "10 Points", "Base floor for all processed payments"),
        ("Critical Amount (>= ₹40,000)", "+60 Points", "High monetary value triggers immediate warning"),
        ("Moderate Amount (>= ₹15,000)", "+25 Points", "Above-average payment threshold addition"),
        ("Unknown / New Location", "+30 Points", "Geographical deviation or missing origin coordinates"),
        ("High-Risk Transfer (>= ₹15k)", "+20 Points", "Peer-to-peer or outbound high-value transfer"),
        ("Large Cash Withdrawal (>= ₹20k)", "+15 Points", "Elevated ATM / liquid cash withdrawal velocity")
    ]

    for title, pts, desc in weights:
        p = tf_l.add_paragraph()
        r1 = p.add_run()
        r1.text = title + " "
        r1.font.bold = True
        r1.font.color.rgb = TEXT_WHITE
        r2 = p.add_run()
        r2.text = f"[{pts}]: "
        r2.font.bold = True
        r2.font.color.rgb = YELLOW
        r3 = p.add_run()
        r3.text = desc
        r3.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(8)
        p.font.size = Pt(11)

    # Right Card: Decision Tiers
    card_r = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(2.0), w_card, Inches(4.8))
    card_r.fill.solid()
    card_r.fill.fore_color.rgb = CARD_BG
    card_r.line.color.rgb = CARD_BORDER

    tx_r = s10.shapes.add_textbox(Inches(7.0), Inches(2.2), w_card - Inches(0.4), Inches(4.4))
    tf_r = tx_r.text_frame
    tf_r.word_wrap = True

    p = tf_r.paragraphs[0]
    p.text = "Risk Thresholds & Actions"
    p.font.name = "Segoe UI"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = CYAN
    p.space_after = Pt(14)

    tiers = [
        ("SAFE / APPROVED", "Score: 0 – 39", GREEN, "Transaction is verified safe. No anomalous deviation detected. Payment approved instantly."),
        ("SUSPICIOUS / FLAGGED", "Score: 40 – 69", YELLOW, "Transaction exhibits unusual patterns. Flagged for review; secondary 2FA verification recommended."),
        ("HIGH RISK / BLOCKED", "Score: 70 – 100", RED, "Severe fraud probability detected. Transaction automatically blocked, and investigative record opened in fraud_cases.")
    ]

    for title, score_range, col, desc in tiers:
        p = tf_r.add_paragraph()
        r1 = p.add_run()
        r1.text = title + "\n"
        r1.font.bold = True
        r1.font.size = Pt(14)
        r1.font.color.rgb = col

        r2 = p.add_run()
        r2.text = score_range + "\n"
        r2.font.bold = True
        r2.font.size = Pt(12)
        r2.font.color.rgb = TEXT_WHITE

        r3 = p.add_run()
        r3.text = desc + "\n"
        r3.font.size = Pt(11)
        r3.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(12)

    # ==========================================
    # SLIDE 11: FUTURE ROADMAP
    # ==========================================
    s11 = prs.slides.add_slide(blank_layout)
    fill_bg(s11)
    add_header(s11, "STRATEGIC ROADMAP", "Future Architecture & Enhancements", "Planned feature iterations to scale FraudGuard AI into high-throughput production.")

    roadmap_items = [
        {
            "num": "01",
            "title": "Machine Learning Pipeline",
            "desc": "Integrate trained Python ensemble models (Random Forest, XGBoost, LightGBM) serialized into ONNX for high-speed inference.",
            "color": CYAN
        },
        {
            "num": "02",
            "title": "Explainability (SHAP)",
            "desc": "Incorporate SHAP waterfall charts directly in the administrative case view to show individual feature contributions to risk scores.",
            "color": GREEN
        },
        {
            "num": "03",
            "title": "Kafka Stream Ingestion",
            "desc": "Decouple synchronous HTTP calls with Apache Kafka event streaming to ingest and score 10,000+ transactions per second.",
            "color": YELLOW
        },
        {
            "num": "04",
            "title": "Cloud CI/CD & Deploy",
            "desc": "Automate GitHub Actions pipelines for Docker containerization and one-click cloud hosting on Railway / Render / AWS ECS.",
            "color": RGBColor(168, 85, 247)
        }
    ]

    card_w = Inches(2.7)
    card_gap = Inches(0.28)
    for i, rm in enumerate(roadmap_items):
        x = Inches(0.8) + i * (card_w + card_gap)
        c = s11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.0), card_w, Inches(4.8))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = CARD_BORDER

        tx = s11.shapes.add_textbox(x + Inches(0.2), Inches(2.2), card_w - Inches(0.4), Inches(4.4))
        tf = tx.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = rm["num"]
        p.font.name = "Segoe UI"
        p.font.size = Pt(36)
        p.font.bold = True
        p.font.color.rgb = rm["color"]

        p2 = tf.add_paragraph()
        p2.text = rm["title"]
        p2.font.name = "Segoe UI"
        p2.font.size = Pt(16)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_WHITE
        p2.space_before = Pt(8)
        p2.space_after = Pt(12)

        p3 = tf.add_paragraph()
        p3.text = rm["desc"]
        p3.font.name = "Segoe UI"
        p3.font.size = Pt(12)
        p3.font.color.rgb = RGBColor(203, 213, 225)
        p3.line_spacing = 1.3

    # ==========================================
    # SLIDE 12: CONCLUSION / THANK YOU
    # ==========================================
    s12 = prs.slides.add_slide(blank_layout)
    fill_bg(s12)

    c12 = s12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.0), Inches(11.733), Inches(5.5))
    c12.fill.solid()
    c12.fill.fore_color.rgb = CARD_BG
    c12.line.color.rgb = CARD_BORDER

    tx12 = s12.shapes.add_textbox(Inches(1.5), Inches(1.8), Inches(10.3), Inches(4.0))
    tf12 = tx12.text_frame
    tf12.word_wrap = True

    p = tf12.paragraphs[0]
    p.text = "Thank You!"
    p.font.name = "Segoe UI"
    p.font.size = Pt(44)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE

    p2 = tf12.add_paragraph()
    p2.text = "FraudGuard AI — Protecting Every Financial Transaction"
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(20)
    p2.font.bold = True
    p2.font.color.rgb = CYAN
    p2.space_before = Pt(8)
    p2.space_after = Pt(25)

    p3 = tf12.add_paragraph()
    p3.text = "Project Summary Highlights:\n• Live Full-Stack Architecture running on Spring Boot 4 & MySQL 8.\n• Real-Time Threat Evaluation with Multi-Vector Scoring (0-100).\n• Comprehensive UI/UX with User & Administrative Surveillance Consoles.\n• Complete Technical Documentation and Version Controlled on GitHub."
    p3.font.name = "Segoe UI"
    p3.font.size = Pt(14)
    p3.font.color.rgb = RGBColor(203, 213, 225)
    p3.line_spacing = 1.4
    p3.space_after = Pt(25)

    p4 = tf12.add_paragraph()
    p4.text = "GitHub Repository: https://github.com/kritikaperti/AI-POWERED-FRAUD-DETECTION"
    p4.font.name = "Segoe UI"
    p4.font.size = Pt(13)
    p4.font.bold = True
    p4.font.color.rgb = CYAN

    # Save to all destination paths
    for pth in output_paths:
        prs.save(pth)
        print(f"Saved PPTX to: {pth}")

if __name__ == "__main__":
    out1 = r"c:\Users\KRITIKA PERTI\OneDrive\Desktop\AI-POWERED FRAUD DETECTION SYSTEM\FraudGuard_AI_Presentation.pptx"
    out2 = r"c:\Users\KRITIKA PERTI\OneDrive\Desktop\AI-POWERED FRAUD DETECTION SYSTEM\docs\FraudGuard_AI_Presentation.pptx"
    create_deck([out1, out2])
