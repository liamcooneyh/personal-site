import { useState } from 'react';

const HEADSHOT_SRC = '/me/headshot.webp';
const SKETCH_SRC = '/art/202-l.webp';

export const Headshot = () => {
  const [hasPhoto, setHasPhoto] = useState(true);

  if (!hasPhoto) {
    return (
      <div className="headshot headshot--sketch">
        <img src={SKETCH_SRC} alt="Crosshatched ink sketch of a face from Liam’s sketchbook" />
      </div>
    );
  }

  return (
    <div className="headshot">
      <img
        src={HEADSHOT_SRC}
        alt="Liam Cooney, black and white portrait against a concrete wall"
        onError={() => setHasPhoto(false)}
      />
    </div>
  );
};
