import { CERTIFICATIONS, PROJECTS, TOOLKIT } from '../data/content';
import { ToolChips } from './ToolChips';
import { ToolLogo } from './ToolLogo';

export const Projects = () => (
  <div className="bento">
    {PROJECTS.map((project) => (
      <article key={project.id} className={`tile tile--${project.size} swatch-${project.swatch}`}>
        <p className="tile__tag">{project.tag}</p>
        <h3 className="tile__name">{project.name}</h3>
        <p className="tile__pitch">{project.pitch}</p>
        {project.steps.length > 0 && (
          <ol className="tile__steps" aria-label={`How ${project.name} works`}>
            {project.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}
        <div className="tile__stack">
          <ToolChips tools={project.stack} label={`Built with`} />
        </div>
        {project.link && (
          <a className="pill tile__link" href={project.link} target="_blank" rel="noreferrer">
            See the code
          </a>
        )}
      </article>
    ))}

    <article className="tile tile--toolkit swatch-lime">
      <h3 className="tile__name">What I build with</h3>
      <div className="toolkit">
        {TOOLKIT.map((column) => (
          <div key={column.group} className="toolkit__column">
            <h4 className="toolkit__group">{column.group}</h4>
            <ul className="toolkit__list">
              {column.items.map((item) => (
                <li key={item}>
                  <ToolLogo tool={item} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="toolkit__certs">
        <strong>Certified:</strong> {CERTIFICATIONS.join(', ')}
      </p>
    </article>
  </div>
);
