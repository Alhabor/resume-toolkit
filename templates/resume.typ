#let ink = rgb("#242A30")
#let muted = rgb("#626B73")
#let accent = rgb("#5B2A86")
#let rule = rgb("#5B2A86")

#let section(title) = {
  v(10pt)
  grid(
    columns: (auto, 1fr),
    align: horizon,
    gutter: 9pt,
    text(size: 10pt, weight: "bold", fill: accent, tracking: 0.6pt)[#title],
    line(length: 100%, stroke: 0.4pt + rule),
  )
  v(5pt)
}

#let heading(title, subtitle, meta) = {
  grid(
    columns: (1fr, auto),
    gutter: 8pt,
    text(size: 10pt, weight: "bold", fill: ink)[#title],
    text(size: 8.2pt, fill: muted)[#meta],
  )
  if subtitle != "" {
    v(2pt)
    text(size: 8.4pt, fill: muted)[#subtitle]
  }
  v(6pt)
}

#let bullet(item, language) = {
  block(above: 0pt, below: if language == "zh" { 6pt } else { 5pt }, breakable: false)[
    #if item.label != "" [
      #grid(
        columns: (if language == "zh" { 24mm } else { 29mm }, 1fr),
        gutter: 7pt,
        text(size: 8.8pt, weight: "bold", fill: ink)[#item.label#if language == "zh" { "：" } else { ":" }],
        text(size: 9.1pt, fill: ink)[#item.body],
      )
    ] else [
      #grid(columns: (3mm, 1fr), gutter: 4pt,
        text(size: 9pt, fill: accent)[•],
        text(size: 9.1pt, fill: ink)[#item.body])
    ]
  ]
}

#let qr-card(item) = {
  align(center)[
    #image(item.path, width: 22mm, height: 22mm)
    #v(2pt)
    #text(size: 7.2pt, fill: ink)[#item.label]
  ]
}

#let render-resume(data) = {
  let zh = data.language == "zh"
  let body-size = if zh { 10pt } else { 9.7pt }
  set page(paper: "a4", margin: (top: 13mm, bottom: 13mm, x: 16mm))
  set text(font: "Arial", size: body-size, fill: ink, lang: data.language)
  set par(leading: if zh { 1.0em } else { 0.94em }, spacing: 0pt, justify: false)

  grid(columns: (1fr, auto), align: horizon, gutter: 12pt,
    [
      #text(size: if zh { 25pt } else { 23pt }, weight: "bold", fill: ink)[#data.basics.name]
      #if data.basics.label != "" {
        linebreak()
        text(size: 8.8pt, fill: accent)[#data.basics.label]
      }
    ],
    align(right)[
      #text(size: 8pt, fill: muted)[#data.basics.contact_primary]
      #if data.basics.links.len() > 0 {
        linebreak()
        for (index, item) in data.basics.links.enumerate() {
          if index > 0 { text(fill: muted)[ · ] }
          if item.url != "" {
            link(item.url)[#text(size: 8pt, fill: accent)[#item.label]]
          } else {
            text(size: 8pt, fill: accent)[#item.label]
          }
        }
      }
    ])

  v(6pt)
  line(length: 100%, stroke: 1.2pt + accent)
  if data.summary != "" {
    v(6pt)
    text(size: if zh { 9.1pt } else { 8.9pt }, fill: ink)[#data.summary]
  }

  if data.education.len() > 0 {
    section(data.section_titles.education)
    for (index, item) in data.education.enumerate() {
      heading(item.title, item.subtitle, item.meta)
      if item.location != "" {
        text(size: 8.2pt, fill: muted)[#item.location]
      }
      for detail in item.details { bullet(detail, data.language) }
      if index < data.education.len() - 1 { v(4pt) }
    }
  }

  if data.work.len() > 0 {
    section(data.section_titles.work)
    for (index, item) in data.work.enumerate() {
      heading(item.title, item.subtitle, item.meta)
      for highlight in item.highlights { bullet(highlight, data.language) }
      if index < data.work.len() - 1 { v(4pt) }
    }
  }

  if data.projects.len() > 0 {
    section(data.section_titles.projects)
    for item in data.projects {
      heading(item.title, item.subtitle, item.meta)
      if item.description != "" {
        text(size: body-size - 0.3pt, fill: ink)[#item.description]
        v(2pt)
      }
      for highlight in item.highlights { bullet(highlight, data.language) }
    }
  }

  let render-skills = {
    section(data.section_titles.skills)
    set par(leading: 0.35em, spacing: 0pt)
    for item in data.skills {
      block(above: 0pt, below: 3pt)[
        #grid(columns: (if zh { 24mm } else { 29mm }, 1fr), gutter: 5pt,
          text(size: 8.2pt, weight: "bold", fill: ink)[#item.title],
          text(size: 8.2pt, fill: ink)[#item.keywords])
      ]
    }
  }

  if data.qr_codes.len() > 0 {
    grid(columns: (1fr, 47mm), gutter: 5mm, align: top,
      [#render-skills],
      [
        #v(10pt)
        #grid(columns: (1fr, auto, 1fr), gutter: 6pt, align: horizon,
          line(length: 100%, stroke: 0.4pt + rule),
          text(size: 9.6pt, weight: "bold", fill: accent, tracking: 0.6pt)[#data.section_titles.links],
          line(length: 100%, stroke: 0.4pt + rule))
        #v(5pt)
        #if data.qr_codes.len() == 1 {
          qr-card(data.qr_codes.first())
        } else {
          grid(columns: (22mm, 22mm), gutter: 3mm, align: top,
            qr-card(data.qr_codes.at(0)),
            qr-card(data.qr_codes.at(1)))
        }
      ])
  } else if data.skills.len() > 0 {
    render-skills
  }
}
