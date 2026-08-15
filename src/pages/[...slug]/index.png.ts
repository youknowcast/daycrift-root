import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import satori from "satori";
import sharp from "sharp";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";
import { getPostSlug } from "@/utils/getPostPaths";
import { postFilter } from "@/utils/postFilter";
import config from "@/config";

// 記事タイトルは日本語のため、OG 画像は CJK 対応の Noto Sans JP で描画する。
// Google Sans Code はラテン専用で日本語グリフがなく豆腐になる。
const OG_FONT_FAMILY = "Noto Sans JP";

// ビルド時は記事ごとに GET が走るため、フォント取得は一度だけにメモ化する
// (CJK フォントは 1 体重数 MB あり、109 記事 × 2 回フェッチするとビルドが重くなる)。
let fontPromise: Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> | null =
  null;

async function loadOgFonts(requestUrl: URL) {
  const fonts = fontData["--font-noto-sans-jp"];
  const regularPath = getFontPathByWeight(fonts, 400);
  const boldPath = getFontPathByWeight(fonts, 700);

  if (regularPath === undefined || boldPath === undefined) {
    throw new Error("Cannot find the Noto Sans JP font path.");
  }

  const [regular, bold] = await Promise.all([
    fetch(experimental_getFontFileURL(regularPath, requestUrl)).then(res =>
      res.arrayBuffer()
    ),
    fetch(experimental_getFontFileURL(boldPath, requestUrl)).then(res =>
      res.arrayBuffer()
    ),
  ]);

  return { regular, bold };
}

export async function getStaticPaths() {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("posts").then(p =>
    p.filter(postFilter).filter(({ data }) => !data.ogImage)
  );

  return posts.map(post => ({
    params: { slug: getPostSlug(post) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props, url }) => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }

  fontPromise ??= loadOgFonts(url);
  const { regular, bold } = await fontPromise;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          background: "#fefbfb",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "-1px",
                right: "-1px",
                border: "4px solid #000",
                background: "#ecebeb",
                opacity: "0.9",
                borderRadius: "4px",
                display: "flex",
                justifyContent: "center",
                margin: "2.5rem",
                width: "88%",
                height: "80%",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                border: "4px solid #000",
                background: "#fefbfb",
                borderRadius: "4px",
                display: "flex",
                justifyContent: "center",
                margin: "2rem",
                width: "88%",
                height: "80%",
              },
              children: {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    margin: "20px",
                    width: "90%",
                    height: "90%",
                  },
                  children: [
                    {
                      type: "p",
                      props: {
                        style: {
                          fontSize: 72,
                          fontWeight: "bold",
                          fontFamily: OG_FONT_FAMILY,
                          maxHeight: "84%",
                          overflow: "hidden",
                        },
                        children: props.data.title,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          width: "100%",
                          marginBottom: "8px",
                          fontSize: 28,
                          fontFamily: OG_FONT_FAMILY,
                        },
                        children: [
                          {
                            type: "span",
                            props: {
                              children: [
                                "by ",
                                {
                                  type: "span",
                                  props: {
                                    style: { color: "transparent" },
                                    children: '"',
                                  },
                                },
                                {
                                  type: "span",
                                  props: {
                                    style: {
                                      overflow: "hidden",
                                      fontWeight: "bold",
                                    },
                                    children: props.data.author,
                                  },
                                },
                              ],
                            },
                          },
                          {
                            type: "span",
                            props: {
                              style: { overflow: "hidden", fontWeight: "bold" },
                              children: config.site.title,
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: [
        {
          name: OG_FONT_FAMILY,
          data: regular,
          weight: 400,
          style: "normal",
        },
        {
          name: OG_FONT_FAMILY,
          data: bold,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
};
