import { ToolLogo } from './ToolLogo';

/** A row of tool chips, each with its logo. Used for jobs and projects alike. */
export const ToolChips = ({ tools, label }: { tools: string[]; label: string }) => (
  <ul className="tool-chips" aria-label={label}>
    {tools.map((tool) => (
      <li key={tool}>
        <ToolLogo tool={tool} />
        {tool}
      </li>
    ))}
  </ul>
);
