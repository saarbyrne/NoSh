import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Local design-system guardrails
  {
    files: ["**/*.{ts,tsx}", "!node_modules/**"],
    settings: {
      "jsx-a11y": {
        components: {
          // Map custom components if needed later
        },
      },
    },
    plugins: {
      // Load a11y plugin at top-level via compat already; rules below will work
      "design-system": {
        rules: {
          "no-raw-html-controls": {
            meta: { type: "problem" },
            create(context) {
              const banned = new Set(["button", "input", "select", "textarea", "label"]);
              const isInUiLib = /[\\/]components[\\/]ui[\\/]/.test(context.getFilename());
              if (isInUiLib) {
                return {};
              }
              return {
                JSXOpeningElement(node) {
                  const name = node.name && node.name.name;
                  if (typeof name === "string" && banned.has(name)) {
                    context.report({
                      node,
                      message:
                        `Use design-system components (e.g. '@/components/ui/*') instead of raw <${name}>`,
                    });
                  }
                },
              };
            },
          },
          "no-hardcoded-colors": {
            meta: { type: "problem" },
            create(context) {
              const isInUiLib = /[\\/]components[\\/]ui[\\/]/.test(context.getFilename());
              const isLayoutFile = /[\\/]src[\\/]app[\\/]layout\.tsx$/.test(context.getFilename());
              if (isInUiLib) {
                return {};
              }
              const isCssColor = (str) => {
                if (typeof str !== "string") return false;
                const s = str.trim();
                // Ignore Tailwind utility class strings completely
                if (/\b(?:text|bg|border|ring|shadow|from|via|to)-/.test(s)) return false;
                if (isLayoutFile) return false; // allow themeColor in layout
                if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s)) return true;
                if (/^rgba?\(/.test(s) || /^hsla?\(/.test(s)) return true;
                // named colors only when the whole string is that color
                const named = ["red","blue","green","black","white","gray","grey","yellow","orange","purple","pink","cyan","magenta"];
                if (named.includes(s)) return true;
                return false;
              };
              return {
                Literal(node) {
                  if (isCssColor(node.value)) {
                    context.report({
                      node,
                      message: "Do not hardcode colors. Use CSS vars or Tailwind tokens.",
                    });
                  }
                },
                TemplateLiteral(node) {
                  const str = node.quasis.map(q => q.value.cooked).join("");
                  if (isCssColor(str)) {
                    context.report({ node, message: "Do not hardcode colors. Use CSS vars or Tailwind tokens." });
                  }
                },
              };
            },
          },
        },
      },
    },
    rules: {
      // Accessibility rules
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "design-system/no-raw-html-controls": "error",
      "design-system/no-hardcoded-colors": "warn",
    },
  },
];

export default eslintConfig;
