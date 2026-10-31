import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1f4d2e",
          deep: "#163821",
          soft: "#e7f0ea",
        },
        paper: {
          DEFAULT: "#f3eee4",
          card: "#fffdf8",
          line: "#ddd5c6",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 10px 30px rgba(28, 25, 23, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
