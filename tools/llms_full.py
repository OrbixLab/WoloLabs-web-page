"""Writes llms-full.txt: llms.txt followed by the six English guides as Markdown.

Run it from the repo root after changing a guide:

    python tools/llms_full.py

It reads Guides/NN-slug/index.html (the hero and the <article class="g-article">) and
converts the guide components to Markdown. Standard library only.
"""
import html
import pathlib
import re
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://wololabs.com"
VOID = {"img", "br", "hr", "meta", "link", "input", "source"}


class Node:
    def __init__(self, tag, attrs, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    def cls(self):
        return self.attrs.get("class", "").split()


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = self.cur = Node("root", [])

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def find(node, pred):
    for c in node.children:
        if isinstance(c, Node):
            if pred(c):
                return c
            hit = find(c, pred)
            if hit:
                return hit
    return None


def text(node):
    return "".join(c if isinstance(c, str) else text(c) for c in node.children)


def squash(s):
    return re.sub(r"\s+", " ", s).strip()


class Md:
    def __init__(self, base_url):
        self.base = base_url

    def url(self, href):
        if href.startswith(("http", "mailto:", "#")):
            return href
        parts = self.base.rstrip("/").split("/")
        for seg in href.split("/"):
            if seg == "..":
                parts.pop()
            elif seg not in ("", "."):
                parts.append(seg)
        return "/".join(parts)

    def inline(self, node):
        out = []
        for c in node.children:
            if isinstance(c, str):
                out.append(c)
                continue
            inner = self.inline(c)
            if c.tag in ("strong", "b"):
                out.append(f"**{inner.strip()}**")
            elif c.tag in ("em", "i"):
                out.append(f"*{inner.strip()}*")
            elif c.tag == "code":
                out.append(f"`{text(c)}`")
            elif c.tag == "a":
                out.append(f"[{inner.strip()}]({self.url(c.attrs.get('href', ''))})")
            elif c.tag == "span" and "g-ui" in c.cls():
                out.append(f"“{squash(text(c))}”")
            elif c.tag == "br":
                out.append(" ")
            else:
                out.append(inner)
        return squash("".join(out))

    def block(self, node, depth=0):
        """Markdown for a block-level node, as a list of paragraphs."""
        t, cls = node.tag, node.cls()
        if t == "section":
            return self.children(node, depth)
        if t == "h2":
            num = find(node, lambda n: "g-num" in n.cls())
            title = squash(text(node))
            if num:
                title = squash(title.replace(text(num), "", 1))
            return [f"## {title}"]
        if t == "h3":
            return [f"### {self.inline(node)}"]
        if t == "p":
            return [self.inline(node)]
        if t in ("ul", "ol"):
            return [self.list(node, depth)]
        if t == "table":
            return [self.table(node)]
        if t == "pre":
            return ["```\n" + text(node).strip("\n") + "\n```"]
        if t == "dl":
            items, term = [], None
            for c in node.children:
                if isinstance(c, Node) and c.tag == "dt":
                    term = self.inline(c)
                elif isinstance(c, Node) and c.tag == "dd":
                    items.append(f"- **{term}**: {self.inline(c)}")
            return ["\n".join(items)]
        if t == "figure":
            return self.figure(node)
        if t == "details":
            summary = find(node, lambda n: n.tag == "summary")
            body = find(node, lambda n: n.tag == "div")
            out = [f"**{squash(text(summary))}**"] if summary else []
            return out + (self.children(body, depth) if body else [])
        if t == "div":
            if "g-pending" in cls:
                return []
            if "g-prompt" in cls:
                label = find(node, lambda n: "g-prompt-label" in n.cls())
                body = find(node, lambda n: "g-prompt-text" in n.cls())
                quoted = "\n".join("> " + line if line.strip() else ">" for line in text(body).strip().splitlines())
                return [f"**{squash(text(label))}** (message to paste into the agent chat):\n\n{quoted}"]
            if "g-callout" in cls:
                title = find(node, lambda n: "g-callout-title" in n.cls())
                rest = [b for c in node.children if isinstance(c, Node) and c is not title for b in self.block(c, depth)]
                head = f"**{squash(text(title))}.** " if title else ""
                lines = (head + "\n\n".join(rest)).splitlines()
                return ["\n".join("> " + l if l.strip() else ">" for l in lines)]
            return self.children(node, depth)
        return self.children(node, depth)

    def children(self, node, depth=0):
        out = []
        for c in node.children:
            if isinstance(c, Node):
                out += self.block(c, depth)
            elif c.strip():
                out.append(squash(c))
        return [o for o in out if o.strip()]

    def list(self, node, depth):
        ordered, lines, i = node.tag == "ol", [], 0
        for li in node.children:
            if not (isinstance(li, Node) and li.tag == "li"):
                continue
            i += 1
            blocks = []
            inline_parts = Node("li", [])
            for c in li.children:
                if isinstance(c, Node) and c.tag in ("p", "h3", "ul", "ol", "figure", "div", "pre", "table"):
                    if inline_parts.children:
                        blocks.append(self.inline(inline_parts))
                        inline_parts.children = []
                    if c.tag == "h3":
                        blocks.append(f"**{self.inline(c)}**")
                    else:
                        blocks += self.block(c, depth + 1)
                else:
                    inline_parts.children.append(c)
            if inline_parts.children and self.inline(inline_parts):
                blocks.append(self.inline(inline_parts))
            marker = f"{i}. " if ordered else "- "
            pad = " " * len(marker)
            first, *rest = [b for b in blocks if b.strip()] or [""]
            item = marker + first
            for b in rest:
                item += "\n\n" + "\n".join(pad + l if l.strip() else "" for l in b.splitlines())
            lines.append(item)
        return ("\n\n" if any("\n\n" in l for l in lines) else "\n").join(lines)

    def table(self, node):
        rows = []
        for tr in self.all(node, "tr"):
            cells = [self.inline(c).replace("|", "\\|") for c in tr.children if isinstance(c, Node) and c.tag in ("td", "th")]
            rows.append(cells)
        if not rows:
            return ""
        has_head = find(node, lambda n: n.tag == "thead") is not None
        head = rows[0] if has_head else [""] * len(rows[0])
        body = rows[1:] if has_head else rows
        out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
        out += ["| " + " | ".join(r) + " |" for r in body]
        return "\n".join(out)

    def all(self, node, tag):
        out = []
        for c in node.children:
            if isinstance(c, Node):
                if c.tag == tag:
                    out.append(c)
                out += self.all(c, tag)
        return out

    def figure(self, node):
        cap = find(node, lambda n: n.tag == "figcaption")
        caption = self.inline(cap) if cap else ""
        out = []
        for img in self.all(node, "img"):
            out.append(f"![{img.attrs.get('alt', '')}]({self.url(img.attrs.get('src', ''))})")
        svg_title = find(node, lambda n: n.tag == "title")
        if svg_title:
            out.append(f"*Diagram:* {squash(text(svg_title))}")
        if caption:
            out.append(f"*{caption}*")
        return ["\n".join(out)]


def guide_markdown(page: pathlib.Path) -> str:
    tree = Tree()
    tree.feed(page.read_text(encoding="utf-8"))
    rel = page.relative_to(ROOT).as_posix()
    url = f"{SITE}/{rel}"
    md = Md(url.rsplit("/", 1)[0])
    h1 = find(tree.root, lambda n: n.tag == "h1")
    lede = find(tree.root, lambda n: "g-lede" in n.cls())
    meta = find(tree.root, lambda n: "g-meta" in n.cls())
    article = find(tree.root, lambda n: n.tag == "article" and "g-article" in n.cls())
    parts = [f"# {squash(text(h1))}", f"Source: {url}", f"> {squash(text(lede))}"]
    if meta:
        parts.append("*" + " · ".join(squash(text(s)) for s in meta.children if isinstance(s, Node)) + "*")
    parts += md.children(article)
    return "\n\n".join(parts)


def main():
    head = (ROOT / "llms.txt").read_text(encoding="utf-8").rstrip()
    guides = sorted(ROOT.glob("Guides/[0-9][0-9]-*/index.html"))
    body = "\n\n---\n\n".join(guide_markdown(p) for p in guides)
    out = (
        f"{head}\n\n---\n\n"
        "# Creator guides, full text\n\n"
        "The six Atlas Studio guides in English, in order. Each one is also published in Spanish "
        "(same URL with es.html instead of index.html). On-screen labels from Atlas Studio and AtlasHub "
        "are quoted in Spanish, as they appear in the app.\n\n---\n\n"
        f"{body}\n"
    )
    (ROOT / "llms-full.txt").write_text(out, encoding="utf-8", newline="\n")
    print(f"llms-full.txt: {len(guides)} guides, {len(out):,} characters")


if __name__ == "__main__":
    main()
