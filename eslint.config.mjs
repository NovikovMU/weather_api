import js from "@eslint/js";


export default [
  js.configs.recommended,

  {
      rules: {
          "no-unused-vars": "warn",
          "no-undef": "warn",
          "no-trailing-spaces": "warn",
          "no-multiple-empty-lines": "warn",
          "no-tabs": "warn",
          "indent": ["error", 4]
      }
  }
];