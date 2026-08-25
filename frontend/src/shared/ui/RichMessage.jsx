import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import './rich-message.css';
import { useI18n } from '../i18n/i18n';

function normalizeMathDelimiters(value = '') {
  return String(value)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, expression) => `\n$$${expression.trim()}$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, expression) => `$${expression.trim()}$`)
    .replace(/\$\s+([^$\n]+?)\s+\$/g, (_, expression) => `$${expression.trim()}$`);
}

export function RichMessage({ children }) {
  const { t } = useI18n();
  return (
    <div className="rich-message">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{
          h1: ({ children: content }) => <h2>{content}</h2>,
          table: ({ children: content }) => (
            <div className="rich-message__table" tabIndex="0" role="region" aria-label={t('ui.responseTable')}>
              <table>{content}</table>
            </div>
          ),
          a: ({ children: content, href, title }) => (
            <a href={href} title={title} target="_blank" rel="noreferrer">{content}</a>
          ),
        }}
      >
        {normalizeMathDelimiters(children)}
      </ReactMarkdown>
    </div>
  );
}
