export class FenceSyntaxes {
  static TAGS = Object.freeze([])

  knows(tag) {
    return FenceSyntaxes.TAGS.includes(tag)
  }

  async problems(tag, source) {
    void tag
    void source
    return []
  }
}
