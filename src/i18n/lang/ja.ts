import type { UIStrings } from "../types";

export default {
  nav: {
    home: "ホーム",
    posts: "記事",
    tags: "タグ",
    about: "アバウト",
    archives: "アーカイブ",
    search: "検索",
  },
  post: {
    publishedAt: "公開日",
    updatedAt: "更新日",
    sharePostIntro: "この記事をシェア：",
    sharePostOn: "{{platform}} でシェア",
    sharePostViaEmail: "メールでシェア",
    tagLabel: "タグ",
    backToTop: "トップへ戻る",
    goBack: "戻る",
    editPage: "ページを編集",
    previousPost: "前の記事",
    nextPost: "次の記事",
  },
  pagination: {
    prev: "前へ",
    next: "次へ",
    page: "ページ",
  },
  home: {
    socialLinks: "ソーシャルリンク",
    featured: "注目",
    recentPosts: "最近の投稿",
    allPosts: "すべての投稿",
  },
  footer: {
    copyright: "Copyright",
    allRightsReserved: "All rights reserved.",
  },
  pages: {
    tagTitle: "タグ",
    tagDesc: "このタグが付いたすべての記事",

    tagsTitle: "タグ",
    tagsDesc: "記事で使われているすべてのタグ",

    postsTitle: "記事",
    postsDesc: "投稿したすべての記事",

    archivesTitle: "アーカイブ",
    archivesDesc: "アーカイブしたすべての記事",

    searchTitle: "検索",
    searchDesc: "記事を検索...",
  },
  a11y: {
    skipToContent: "本文へスキップ",
    openMenu: "メニューを開く",
    closeMenu: "メニューを閉じる",
    toggleTheme: "テーマを切り替え",
    searchPlaceholder: "記事を検索...",
    noResults: "結果が見つかりません",
    goToPreviousPage: "前のページへ",
    goToNextPage: "次のページへ",
  },
  notFound: {
    title: "404 ページが見つかりません",
    message: "ページが見つかりません",
    goHome: "ホームに戻る",
  },
} satisfies UIStrings;
