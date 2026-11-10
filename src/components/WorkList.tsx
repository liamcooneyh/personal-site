import { JOBS, type Job, type JobArea } from '../data/content';
import { ToolChips } from './ToolChips';

const AreaCard = ({ area }: { area: JobArea }) => (
  <li className="area">
    <h4 className="area__title">{area.title}</h4>
    <p className="area__text">{area.text}</p>
  </li>
);

/** Every tool named across the job's areas, once each, in order of first mention. */
const toolsOf = (job: Job) => [...new Set(job.areas.flatMap((area) => area.tools))];

const JobBand = ({ job }: { job: Job }) => (
  <li className={`job swatch-${job.swatch}`}>
    <div className="job__top">
      <h3 className="job__company">{job.company}</h3>
      <p className="job__role">
        {job.role}
        <span className="job__when">{job.when}</span>
      </p>
    </div>
    <p className="job__oneliner">{job.oneLiner}</p>
    <ul className="job__areas">
      {job.areas.map((area) => (
        <AreaCard key={area.title} area={area} />
      ))}
    </ul>
    <ToolChips tools={toolsOf(job)} label={`Tools at ${job.company}`} />
  </li>
);

export const WorkList = () => (
  <ol className="jobs">
    {JOBS.map((job) => (
      <JobBand key={job.id} job={job} />
    ))}
  </ol>
);
