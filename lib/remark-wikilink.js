import visit from "unist-util-visit";

function remarkWikiLink() {
  return (tree) => {
    visit(tree, "text", (node, index, parent) => {
      const regex = /\[\[([^\[\]]+)\]\]/g;
      let match;
      let lastIndex = 0;
      const newChildren = [];
      let value = node.value;

      while ((match = regex.exec(value)) !== null) {
        if (match.index > lastIndex) {
          newChildren.push({
            type: "text",
            value: value.slice(lastIndex, match.index),
          });
        }
        newChildren.push({
          type: "mdxJsxTextElement",
          name: "WikiLink",
          attributes: [],
          children: [{ type: "text", value: match[1] }],
        });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < value.length) {
        newChildren.push({
          type: "text",
          value: value.slice(lastIndex),
        });
      }
      if (newChildren.length) {
        parent.children.splice(index, 1, ...newChildren);
        return [visit.SKIP, index + newChildren.length];
      }
    });
  };
}

export default {
  plugins: [remarkWikiLink]
};