"""Wallpaper doodle Paddy (2560x1440) — gaya banner paddy.id: bidang warna,
mata bulat, bintang, hati, bunga, coretan, tekstur titik. Tengah dibiarkan lega."""
import random, math, sys
W, H = 2560, 1440
NAVY = "#23307a"

THEMES = {
    "pink":  dict(bg="#e3066f", light="#f2479a", dark="#b8045a", ribbon="#c9a8f5", accent="#fbb102", accent2="#ffffff", dot="#ffffff"),
    "sunny": dict(bg="#fbb102", light="#ffcb45", dark="#ee8a00", ribbon="#e3066f", accent="#e3066f", accent2="#ffffff", dot="#ffffff"),
    "lilac": dict(bg="#8f6be8", light="#a98bf2", dark="#6f4fd6", ribbon="#fbb102", accent="#e3066f", accent2="#ffffff", dot="#ffffff"),
}

def star4(cx, cy, r, fill, rot=0, stroke=None, sw=0):
    pts = []
    for i in range(8):
        ang = math.radians(rot + i * 45)
        rr = r if i % 2 == 0 else r * 0.32
        pts.append(f"{cx + rr*math.sin(ang):.1f},{cy - rr*math.cos(ang):.1f}")
    st = f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"' if stroke else ""
    return f'<polygon points="{" ".join(pts)}" fill="{fill}"{st}/>'

def eyes(cx, cy, s, rot=0, outline=NAVY):
    """Sepasang mata bulat khas Paddy: putih, pupil navy, kilau bintang."""
    g = [f'<g transform="translate({cx},{cy}) rotate({rot}) scale({s})">']
    for dx in (-48, 48):
        g.append(f'<ellipse cx="{dx}" cy="0" rx="44" ry="58" fill="#fff" stroke="{outline}" stroke-width="9"/>')
        g.append(f'<ellipse cx="{dx+8}" cy="8" rx="26" ry="34" fill="{NAVY}"/>')
        g.append(star4(dx + 4, -4, 15, "#fff"))
    g.append("</g>")
    return "".join(g)

def heart(cx, cy, s, fill, rot=0, with_eyes=False):
    p = "M0,30 C-55,-10 -60,-70 -18,-78 C2,-82 0,-60 0,-55 C0,-60 -2,-82 18,-78 C60,-70 55,-10 0,30 Z"
    out = f'<g transform="translate({cx},{cy}) rotate({rot}) scale({s})"><path d="{p}" fill="{fill}" stroke="{NAVY}" stroke-width="5" stroke-linejoin="round"/>'
    if with_eyes:
        for dx in (-14, 14):
            out += f'<ellipse cx="{dx}" cy="-38" rx="9" ry="12" fill="#fff" stroke="{NAVY}" stroke-width="3"/><circle cx="{dx+2}" cy="-36" r="5" fill="{NAVY}"/>'
    return out + "</g>"

def daisy(cx, cy, r, petal, center, rot=0):
    out = f'<g transform="translate({cx},{cy}) rotate({rot})">'
    for i in range(8):
        a = i * 45
        out += f'<ellipse cx="0" cy="{-r*0.62:.1f}" rx="{r*0.3:.1f}" ry="{r*0.46:.1f}" fill="{petal}" stroke="{NAVY}" stroke-width="5" transform="rotate({a})"/>'
    out += f'<circle r="{r*0.34:.1f}" fill="{center}" stroke="{NAVY}" stroke-width="5"/></g>'
    return out

def squiggle(x, y, length, amp, color, sw, rot=0, dash=None):
    pts = [f"M0,0"]
    seg = length / 6
    for i in range(6):
        pts.append(f"q{seg/2:.1f},{(-amp if i % 2 == 0 else amp):.1f} {seg:.1f},0")
    d = " ".join(pts)
    da = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<path d="{d}" transform="translate({x},{y}) rotate({rot})" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round"{da}/>'

def build(name):
    t = THEMES[name]
    rnd = random.Random(42)
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f'<rect width="{W}" height="{H}" fill="{t["bg"]}"/>']
    # Blob organik besar di pojok (bidang warna ala banner)
    o.append(f'<path d="M-80,-80 L760,-80 C700,120 820,260 640,380 C470,495 300,380 160,520 C60,620 -10,560 -80,600 Z" fill="{t["light"]}"/>')
    o.append(f'<path d="M2640,1520 L1860,1520 C1900,1330 1790,1240 1950,1110 C2110,980 2260,1100 2380,960 C2470,860 2560,900 2640,860 Z" fill="{t["dark"]}"/>')
    o.append(f'<path d="M2640,-80 L2140,-80 C2180,60 2290,120 2420,110 C2520,104 2580,170 2640,200 Z" fill="{t["accent"]}" opacity="0.9"/>')
    # Pita swirl tebal (seperti swirl ungu di banner Welcome)
    o.append(f'<path d="M-60,1180 C180,1010 360,1290 600,1150 C760,1060 720,940 880,930" fill="none" stroke="{t["ribbon"]}" stroke-width="70" stroke-linecap="round"/>')
    o.append(f'<path d="M1720,150 C1820,60 1960,130 2010,40" fill="none" stroke="{t["ribbon"]}" stroke-width="46" stroke-linecap="round"/>')
    # Tekstur titik (speckle) — hindari area tengah agar form login bersih
    for _ in range(700):
        x, y = rnd.uniform(0, W), rnd.uniform(0, H)
        r = rnd.choice([2.5, 3, 3.5, 4.5])
        op = 0.22 if (820 < x < 1740 and 220 < y < 1260) else 0.42
        o.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="{t["dot"]}" opacity="{op}"/>')
    # Coretan putus-putus
    o.append(squiggle(140, 760, 420, 34, "#fff", 10, rot=-8, dash="2 26"))
    o.append(squiggle(2040, 640, 380, 30, "#fff", 10, rot=12, dash="2 26"))
    o.append(squiggle(1080, 1340, 420, 26, "#fff", 9, rot=-2))
    o.append(squiggle(1180, 90, 360, 24, "#fff", 9, rot=4))
    # Mata bulat — maskot paling khas Paddy
    o.append(eyes(420, 1010, 1.55, rot=-10))
    o.append(eyes(2230, 330, 1.25, rot=8))
    o.append(eyes(2010, 1225, 0.8, rot=-6))
    o.append(eyes(620, 210, 0.7, rot=10))
    # Bintang kilau
    for (x, y, r, c, rot) in [(250, 330, 70, t["accent"], 8), (1960, 470, 46, "#fff", 0), (760, 560, 34, "#fff", 15),
                              (2470, 1180, 54, t["accent"], -10), (1500, 1300, 40, t["accent"], 0), (1010, 160, 30, t["accent"], 10),
                              (2460, 560, 30, "#fff", 0), (120, 1320, 38, "#fff", 12), (1790, 1360, 26, "#fff", 0)]:
        o.append(star4(x, y, r, c, rot, stroke=NAVY if c != "#fff" else None, sw=6))
    # Hati & bunga
    o.append(heart(2380, 820, 1.5, t["ribbon"] if name != "sunny" else "#ffffff", rot=12, with_eyes=True))
    o.append(heart(170, 560, 0.9, "#ffffff", rot=-14))
    o.append(daisy(600, 1330, 70, "#ffffff", t["accent"] if name != "sunny" else "#e3066f", rot=10))
    o.append(daisy(2250, 1050, 58, "#ffffff", t["accent"] if name != "sunny" else "#e3066f", rot=-5))
    o.append(daisy(1660, 110, 48, "#ffffff", t["accent"] if name != "sunny" else "#e3066f", rot=20))
    o.append("</svg>")
    return "\n".join(o)

if __name__ == "__main__":
    out = sys.argv[1]
    for n in THEMES:
        open(f"{out}/paddy-{n}.svg", "w").write(build(n))
        print("ok", n)
