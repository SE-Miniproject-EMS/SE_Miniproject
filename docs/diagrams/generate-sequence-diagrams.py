from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
W, H = 1900, 1500
BG = "#ffffff"
INK = "#263341"
MUTED = "#5b6573"
HEADER = "#e9f2ff"
ACCENT = "#375a7f"
LIFELINE = "#a9b4c0"

font_candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/Library/Fonts/Arial.ttf",
]
bold_candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
]

def font(size=22, bold=False):
    paths = bold_candidates if bold else font_candidates
    for p in paths:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def wrap_words(text, fnt, max_width):
    out, current = [], ""
    for word in text.split():
        proposal = word if not current else current + " " + word
        if ImageDraw.Draw(Image.new("RGB", (1,1))).textbbox((0,0), proposal, font=fnt)[2] <= max_width:
            current = proposal
        else:
            if current: out.append(current)
            current = word
    if current: out.append(current)
    return out

def draw_arrow(draw, x1, x2, y, label, number, dashed=False):
    color = ACCENT if number % 2 else MUTED
    left, right = min(x1, x2), max(x1, x2)
    # line, rendered dashed for return messages
    if dashed:
        seg, gap = 12, 8
        x = left
        while x < right - 10:
            x_end = min(x + seg, right - 10)
            draw.line((x, y, x_end, y), fill=color, width=3)
            x = x_end + gap
    else:
        draw.line((left, y, right - 11, y), fill=color, width=3)
    # arrowhead points toward destination
    if x2 >= x1:
        pts = [(right-11, y-8), (right, y), (right-11, y+8)]
    else:
        pts = [(left+11, y-8), (left, y), (left+11, y+8)]
    draw.polygon(pts, fill=color)
    label_font = font(20)
    lines = wrap_words(label, label_font, max(280, abs(x2-x1)-60))
    line_h = 25
    text_w = max(draw.textbbox((0,0), line, font=label_font)[2] for line in lines)
    box_w = min(text_w + 24, max(320, abs(x2-x1)-20))
    box_h = line_h * len(lines) + 12
    mid = (x1+x2)//2
    bx0 = max(12, min(W-box_w-12, mid-box_w//2))
    by0 = y - box_h - 8
    draw.rounded_rectangle((bx0, by0, bx0+box_w, by0+box_h), radius=8, fill=BG, outline="#d4dbe3", width=1)
    draw.text((bx0+12, by0+5), str(number)+". "+lines[0], font=label_font, fill=INK)
    for i,line in enumerate(lines[1:],1):
        draw.text((bx0+36, by0+5+i*line_h), line, font=label_font, fill=INK)

def render(path, title, participants, messages, note):
    im = Image.new("RGB", (W,H), BG)
    d = ImageDraw.Draw(im)
    d.text((W//2, 25), title, anchor="mt", font=font(29, True), fill="#172b4d")
    d.text((W//2, 68), "As-built view of the implementation in this repository snapshot", anchor="mt", font=font(17), fill=MUTED)
    n = len(participants)
    margin = 150
    span = W - 2*margin
    xs = [margin + round(i*span/(n-1)) for i in range(n)]
    lane_w = min(280, int(span/(n-1)*0.70))
    header_y0, header_y1 = 115, 205
    for x, label in zip(xs, participants):
        lines = label.split("\n")
        d.rounded_rectangle((x-lane_w//2, header_y0, x+lane_w//2, header_y1), radius=14, fill=HEADER, outline=ACCENT, width=3)
        h = 29
        total_h = len(lines)*h
        yy = (header_y0+header_y1-total_h)//2
        for line in lines:
            d.text((x, yy), line, anchor="mm", font=font(19, True), fill="#20344d")
            yy += h
        y = header_y1 + 12
        while y < H-115:
            d.line((x,y,x,H-100), fill=LIFELINE, width=2)
            y += 16
            d.line((x,y,x,H-100), fill=BG, width=2)
            y += 12
    top, bottom = 320, H-190
    step = (bottom-top)/(len(messages)-1)
    for i,(src,dst,label,dashed) in enumerate(messages,1):
        y = round(top + (i-1)*step)
        draw_arrow(d, xs[src], xs[dst], y, label, i, dashed)
    d.rounded_rectangle((100,H-100,W-100,H-28), radius=12, fill="#fff7dc", outline="#aa8b31", width=2)
    nf = font(17)
    wrapped = wrap_words(note, nf, W-250)
    yy = H-86
    for line in wrapped[:2]:
        d.text((W//2,yy), line, anchor="mt", font=nf, fill="#725d1e")
        yy += 23
    im.save(path, optimize=True)

render(
    OUT / "as-built-auth-sequence.png",
    "SEQUENCE: REGISTRATION, EMAIL VERIFICATION AND LOGIN",
    ["User", "React SPA", "Express API\n(routes + middleware)", "Auth controller", "Sequelize +\nSQLite"],
    [
        (0,1,"Submit registration form with name, email, password and role",False),
        (1,2,"POST /api/auth/register (JSON)",False),
        (2,3,"Validate input; reject invalid role or duplicate email",False),
        (3,4,"Hash password with bcrypt and create User row",False),
        (4,3,"Return persisted account record",True),
        (3,1,"HTTP 201 with safe public profile; verification link is logged in backend console",True),
        (0,2,"Open the development verification URL: GET /api/auth/verify/:token",False),
        (2,3,"Verify signed token and set isVerified=true",False),
        (3,4,"Persist verified account state",False),
        (0,1,"Submit email and password on Login page",False),
        (1,2,"POST /api/auth/login",False),
        (2,3,"Apply rate limit; check bcrypt password, verified state and 5-failure lockout",False),
        (3,4,"Update failed-attempt / lock fields; reset after successful login",False),
        (3,1,"HTTP 200 returns JWT and public user; failures return structured API errors",True),
    ],
    "No email provider is integrated in this baseline. The verification link is for local development and is printed to the server console."
)

render(
    OUT / "as-built-event-sequence.png",
    "SEQUENCE: EVENT LIFECYCLE AND PUBLIC DISCOVERY",
    ["Organizer /\nAdmin", "React SPA", "Express API\n+ RBAC", "Event controller", "Sequelize +\nSQLite", "Public user"],
    [
        (0,1,"Enter event details and save",False),
        (1,2,"POST /api/events with Bearer JWT",False),
        (2,3,"Authenticate token; require ORGANIZER or ADMIN",False),
        (3,4,"Validate required fields, dates, capacity and numeric values; default status is DRAFT",False),
        (4,3,"Insert Event with organizerId; return 201 { event }",True),
        (0,1,"Choose Publish for a valid draft",False),
        (1,2,"POST /api/events/:id/publish",False),
        (2,3,"Check authentication, role, ownership (or ADMIN) and publish requirements",False),
        (3,4,"Update status to PUBLISHED and persist",False),
        (5,2,"GET /api/events?search=...&category=...&location=...&page=...",False),
        (2,3,"Query future PUBLISHED events; apply filters, sort by start time and paginate",False),
        (3,4,"SELECT event rows and organizer summary",False),
        (4,3,"Return matching rows and pagination metadata",True),
        (3,5,"HTTP 200 { events, pagination } or a structured error",True),
    ],
    "The current event flow does not create attendee registrations or trigger payment, email/SMS notification, QR check-in or feedback workflows."
)
