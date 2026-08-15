import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostUrl } from "@/utils/getPostPaths";
import { getPostDescription } from "@/utils/getPostDescription";
import config from "@/config";

export async function GET() {
  const posts = await getCollection("posts");
  const sortedPosts = getSortedPosts(posts);

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: config.site.url,
    items: sortedPosts.map(post => ({
      link: getPostUrl(post, config.site.lang),
      title: post.data.title,
      description: getPostDescription(post),
      pubDate: new Date(post.data.modDatetime ?? post.data.pubDatetime),
    })),
  });
}
