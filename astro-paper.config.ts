import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://www.daycrift.net",
    title: "CALL ME STUPID",
    description: "engineer blog.",
    author: "youknowcast",
    profile: "https://github.com/youknowcast",
    ogImage: "banner.png",
    lang: "ja",
    timezone: "Asia/Tokyo",
    dir: "ltr",
  },
  posts: {
    perPage: 200,
    perIndex: 5,           // ホームの最近の投稿は直近 5 件
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: false,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/youknowcast" },
    { name: "x",      url: "https://x.com/youknowcast" },
    { name: "note",   url: "https://note.com/youknowcast" },
    { name: "zenn",   url: "https://zenn.dev/youknowcast" },
    { name: "qiita",  url: "https://qiita.com/youknowcast" },
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x",        url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "pinterest", url: "https://pinterest.com/pin/create/button/?url=" },
    { name: "mail",     url: "mailto:?subject=See%20this%20post&body=" },
  ],
});