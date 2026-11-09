-- An observed shortcode and Meta's numeric media ID can refer to the same post.
-- Enforce one record per original shortcode across canonical and profile URLs.
CREATE UNIQUE INDEX "InstagramPost_shortcode_key" ON "InstagramPost" ((substring("permalink" from '/(?:p|reel)/([^/?#]+)')));
