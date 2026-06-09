import re, pathlib
p = pathlib.Path("_knowme-base.tsx")
text = p.read_text(encoding="utf-8-sig")

WELCOME = """const WELCOME =
  \"I'm KNOWME — your CRM guide. Browse Visual Flows for diagrams, or ask anything about clients, money, desk work, and settings. Responses use wiki-style teal links — tap any underlined term to open that topic, like Wikipedia.\";

const STARTERS = [
  \"Explain balance fixes\",
  \"Demo tour\",
  \"How do affiliate trackers work?\",
  \"Explain PSP deposit flow\",
];
"""

text = re.sub(r"const STARTERS = \[.*?\];", WELCOME, text, count=1, flags=re.S)

text = re.sub(
    r'const \[messages, setMessages\] = useState<Msg\[\]>\(\[\s*\{\s*role: "assistant",\s*text: "[^"]*",\s*\},\s*\]\);',
    'const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", text: WELCOME }]);',
    text,
    count=1,
    flags=re.S,
)

text = re.sub(
    r"  const handleTermClick = useCallback\([^)]+\), \[send\]\);[^\n]*\n(?:[^\n]*\n)*?  \);\s*\n",
    """  const handleTermClick = useCallback(
    (_termId: string, label: string) => {
      void send(`Explain ${label}`);
    },
    [send],
  );

""",
    text,
    count=1,
)

text = text.replace(
    "subtitle=\"Visual workflows + chat — learn the platform without reading a manual.\"",
    "subtitle=\"Visual workflows + wiki-style chat — learn the platform without reading a manual.\"",
)
text = re.sub(
    r"<Sparkles size=\{12\} /> \{canAsk \? \"[^\"]+\" : \"[^\"]+\"\}",
    "<Sparkles size={12} /> Linked articles + flows",
    text,
)
text = re.sub(
    r'<p className="text-\[11px\] text-teal-200/60">[^<]+</p>',
    '<p className="text-[11px] text-teal-200/60">Wiki-style · tap teal links to dive deeper</p>',
    text,
    count=1,
)

text = re.sub(
    r'\{msg\.role === "assistant" && hasWikiMarkup\(msg\.text\) \? \(\s*<WikiRichMessage\s+text=\{msg\.text\}\s+onTermClick=\{[^}]+\}\s*/>\s*\) : \(\s*msg\.text\s*\)\}',
    '{msg.role === "assistant" && hasWikiMarkup(msg.text) ? (\n                    <WikiRichMessage text={msg.text} onTermClick={handleTermClick} />\n                  ) : (\n                    <span>{msg.text}</span>\n                  )}',
    text,
    flags=re.S,
)

out = pathlib.Path("src/pages/admin/knowme/KnowmePage.tsx")
out.write_text(text, encoding="utf-8", newline="\n")
print("ok", "void 0" in text, len(text.splitlines()))
