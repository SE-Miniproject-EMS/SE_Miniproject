from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def f(size, bold=False):
    p = FONT_BOLD if bold else FONT_REG
    if Path(p).exists(): return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def wrap(draw, text, font, width):
    lines=[]; cur=""
    for word in text.split():
        test = word if not cur else cur+" "+word
        if draw.textbbox((0,0), test, font=font)[2] <= width: cur=test
        else:
            if cur: lines.append(cur)
            cur=word
    if cur: lines.append(cur)
    return lines

def center_text(draw, box, text, font, fill, line_gap=6):
    x0,y0,x1,y1=box
    lines=[]
    for para in text.split("\n"):
        lines += wrap(draw,para,font,x1-x0-24)
    heights=[draw.textbbox((0,0),line,font=font)[3] for line in lines]
    total=sum(heights)+line_gap*(len(lines)-1)
    y=y0+(y1-y0-total)/2
    for line,h in zip(lines,heights):
        draw.text(((x0+x1)/2,y),line,font=font,fill=fill,anchor="mt")
        y += h+line_gap

def arrow(draw, a, b, color="#59687a", width=3, dashed=False, arrowhead=True):
    x1,y1=a; x2,y2=b
    if not dashed:
        draw.line((x1,y1,x2,y2),fill=color,width=width)
    else:
        import math
        dx=x2-x1; dy=y2-y1; dist=math.hypot(dx,dy)
        if dist:
            ux,uy=dx/dist,dy/dist
            pos=0
            while pos<dist-10:
                end=min(pos+14,dist-10)
                draw.line((x1+ux*pos,y1+uy*pos,x1+ux*end,y1+uy*end),fill=color,width=width)
                pos=end+9
    if arrowhead:
        import math
        ang=math.atan2(y2-y1,x2-x1); length=15; half=7
        p1=(x2,y2)
        p2=(x2-length*math.cos(ang)+half*math.sin(ang), y2-length*math.sin(ang)-half*math.cos(ang))
        p3=(x2-length*math.cos(ang)-half*math.sin(ang), y2-length*math.sin(ang)+half*math.cos(ang))
        draw.polygon([p1,p2,p3],fill=color)

def box(draw, rect, text, fill="#e9f2ff", outline="#375a7f", font_size=23, radius=20):
    draw.rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=3)
    center_text(draw,rect,text,f(font_size,True),"#20344d",line_gap=5)

def ellipse(draw, rect, text):
    draw.ellipse(rect, fill="#f5f8fc", outline="#53749a", width=3)
    center_text(draw,rect,text,f(21),"#20344d",line_gap=5)

def stick_actor(draw, cx, cy, label):
    col="#263341"
    draw.ellipse((cx-19,cy-64,cx+19,cy-26),outline=col,width=4)
    draw.line((cx,cy-26,cx,cy+36),fill=col,width=4)
    draw.line((cx-30,cy-3,cx+30,cy-3),fill=col,width=4)
    draw.line((cx,cy+36,cx-28,cy+78),fill=col,width=4)
    draw.line((cx,cy+36,cx+28,cy+78),fill=col,width=4)
    for j, line in enumerate(label.split("\n")):
        draw.text((cx,cy+91+j*25),line,font=f(21,True),fill=col,anchor="mt")

def usecase():
    W,H=1800,1120; im=Image.new("RGB",(W,H),"white"); d=ImageDraw.Draw(im)
    d.text((W/2,28),"EMS AS-BUILT USE CASES",font=f(36,True),fill="#172b4d",anchor="mt")
    d.text((W/2,76),"Implemented functionality in the repository snapshot — 29 October 2026",font=f(20),fill="#59687a",anchor="mt")
    system=(300,135,1500,1010)
    d.rounded_rectangle(system,radius=22,fill="#fcfdff",outline="#8a97a8",width=4)
    d.text((900,155),"Event Management System — current baseline",font=f(25,True),fill="#34465a",anchor="mt")
    # edges first so they remain behind the boxes
    # User actor for shared authentication cases
    stick_actor(d,150,375,"User")
    for target in [(440,280),(440,400),(440,520)]: arrow(d,(180,360),target,color="#6f7d8d",width=2,arrowhead=False)
    stick_actor(d,150,675,"Attendee")
    arrow(d,(180,650),(800,365),color="#6f7d8d",width=2,arrowhead=False)
    arrow(d,(180,680),(1070,500),color="#6f7d8d",width=2,arrowhead=False)
    stick_actor(d,150,875,"Organizer")
    arrow(d,(180,860),(450,735),color="#6f7d8d",width=2,arrowhead=False)
    arrow(d,(180,875),(710,735),color="#6f7d8d",width=2,arrowhead=False)
    arrow(d,(180,890),(1050,735),color="#6f7d8d",width=2,arrowhead=False)
    stick_actor(d,1640,880,"Admin\n(pre-provisioned)")
    arrow(d,(1600,865),(1430,850),color="#6f7d8d",width=2,arrowhead=False)
    # use cases
    ellipse(d,(440,230,690,320),"Register account\n(Attendee or Organizer)")
    ellipse(d,(440,350,690,440),"Verify email\n(dev link in console)")
    ellipse(d,(440,470,690,560),"Log in / receive JWT")
    ellipse(d,(800,320,1060,410),"Browse, search, filter\nand paginate events")
    ellipse(d,(1070,455,1330,545),"View published\nevent details")
    ellipse(d,(450,680,700,770),"Create event draft")
    ellipse(d,(710,680,1010,770),"Edit, publish or cancel\nan owned event")
    ellipse(d,(1050,680,1300,770),"View / manage\nown events")
    ellipse(d,(1190,805,1450,895),"Manage all events\n(Admin permissions)")
    d.rounded_rectangle((350,920,1450,985),radius=12,fill="#fff7dc",outline="#aa8b31",width=2)
    center_text(d,(360,923,1440,982),"Not in this baseline: attendee registration, waitlist, payments, email/SMS notifications, QR/check-in, dashboards/CSV reports, feedback.",f(18),"#725d1e",line_gap=3)
    im.save(OUT/"as-built-use-cases.png", optimize=True)

def components():
    W,H=1800,1180; im=Image.new("RGB",(W,H),"white"); d=ImageDraw.Draw(im)
    d.text((W/2,26),"EMS AS-BUILT COMPONENT VIEW",font=f(36,True),fill="#172b4d",anchor="mt")
    d.text((W/2,74),"Current implementation; planned service modules are shown explicitly",font=f(20),fill="#59687a",anchor="mt")
    browser=(590,120,1210,235); app=(540,315,1260,445)
    auth=(75,555,555,695); events=(660,555,1140,695); middleware=(1245,555,1725,695)
    data=(575,790,1225,900); sqlite=(675,990,1125,1095)
    ci=(80,810,500,930); planned=(1310,790,1710,960)
    # arrows behind nodes
    arrow(d,(900,235),(900,315),color="#375a7f",width=4)
    # app to three code groups
    arrow(d,(660,445),(315,555),color="#59687a",width=3)
    arrow(d,(900,445),(900,555),color="#59687a",width=3)
    arrow(d,(1140,445),(1485,555),color="#59687a",width=3)
    # controllers/data dependencies
    arrow(d,(400,695),(710,790),color="#59687a",width=3)
    arrow(d,(900,695),(900,790),color="#59687a",width=3)
    arrow(d,(900,900),(900,990),color="#59687a",width=4)
    # CI / backlog references are dotted not runtime dependencies
    arrow(d,(300,810),(540,385),color="#7a8796",width=2,dashed=True,arrowhead=False)
    arrow(d,(1310,850),(1260,400),color="#aa8b31",width=2,dashed=True,arrowhead=False)
    box(d,browser,"Browser: React 18 + Vite\nPages, AuthContext, Axios API client",fill="#e9f2ff",font_size=22)
    box(d,app,"Express application\n/api/health · /api/auth · /api/events · /api/example\nJSON body parsing · CORS · standardized error handling",fill="#f0f4fb",font_size=22)
    box(d,auth,"Auth routes + controller\nregister · verify email · login · current user",fill="#e4f5e9",font_size=20)
    box(d,events,"Event routes + controller\ncreate · list/search · details · edit · publish · cancel",fill="#e4f5e9",font_size=20)
    box(d,middleware,"Auth middleware\nJWT authenticate · role authorize",fill="#fff2d8",font_size=20)
    box(d,data,"Sequelize models: User + Event\nUser has many Events via organizerId",fill="#f0f4fb",font_size=22)
    box(d,sqlite,"SQLite database file\nDATABASE_FILE (default ./dev.db)",fill="#f4eaff",outline="#74509c",font_size=21)
    box(d,ci,"GitHub Actions CI (not runtime)\nNode 24 · backend tests · frontend build",fill="#f5f5f5",outline="#6b7280",font_size=18)
    box(d,planned,"Not implemented in this baseline\nRegistration / waitlist\nPayment / email-SMS notification\nQR check-in / reporting / feedback",fill="#fff7dc",outline="#aa8b31",font_size=18)
    d.text((900,265),"HTTP JSON in local development",font=f(16),fill="#59687a",anchor="mt")
    d.text((900,730),"database reads/writes",font=f(16),fill="#59687a",anchor="mt")
    im.save(OUT/"as-built-components.png", optimize=True)

usecase(); components()
