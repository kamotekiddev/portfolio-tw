# Research decisions

- Use installed unified/remark-parse, matching react-markdown syntax. Regex extraction would include fenced code and lose inline formatting.
- Assign IDs through a remark transform shared with extraction. Prefix IDs with `section-` to avoid page landmarks; preserve Unicode letters/numbers, normalize combining characters, generate suffixes from a used-ID set to avoid natural suffix collisions. Empty labels use Section fallback.
- Use server-rendered native anchors and details. Client scroll observers add unrequested complexity. Navigation appears only next to body so hero remains full-width.
- Sticky navigation scrolls internally if long; narrow screens use details. Existing focus tokens and reduced-motion behavior apply.
