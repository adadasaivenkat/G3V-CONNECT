import React from 'react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';

// Initialize the Giphy client
const giphyFetch = new GiphyFetch('ia65OIs6eB1kltxrly8F4mKhsxsjvPg8');

const GifPicker = ({ setShowGifPicker, onGifSelect }) => {
  return (
    <div className="fixed inset-0 z-10" onClick={() => setShowGifPicker(false)}>
      <div 
        className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 w-[280px] sm:w-[320px] h-[400px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-full overflow-y-auto scrollbar-none">
          <Grid
            width={272}
            columns={2}
            gutter={4}
            fetchGifs={(offset) => giphyFetch.trending({ offset, limit: 10 })}
            onGifClick={(gif, e) => {
              e.preventDefault();
              onGifSelect(gif);
            }}
            noLink={true}
            hideAttribution={true}
            className="!gap-1"
            noResultsMessage="No GIFs found"
            borderRadius={12}
            key="gif-grid"
          />
        </div>
      </div>
    </div>
  );
};

export default GifPicker; 