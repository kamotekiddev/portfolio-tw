import { BlogContentError, loadBlogPosts } from "./blog-content";

try {
  const posts = loadBlogPosts();
  const published = posts.filter((post) => post.status === "published").length;
  console.log(`Blog content valid: ${published} published, ${posts.length - published} draft.`);
} catch (error) {
  console.error(error instanceof BlogContentError ? error.message : "Unable to validate blog content.");
  process.exitCode = 1;
}
