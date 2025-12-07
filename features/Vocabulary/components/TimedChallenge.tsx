'use client';

import React from 'react';
import useVocabStore, {
  type IVocabObj
} from '@/features/Vocabulary/store/useVocabStore';
import useStatsStore from '@/features/Progress/store/useStatsStore';
import TimedChallenge, {
  type TimedChallengeConfig
} from '@/shared/components/TimedChallenge';
import FuriganaText from '@/shared/components/FuriganaText';

export default function TimedChallengeVocab() {
  const selectedVocabObjs = useVocabStore(state => state.selectedVocabObjs);

  const {
    timedVocabCorrectAnswers,
    timedVocabWrongAnswers,
    timedVocabStreak,
    timedVocabBestStreak,
    incrementTimedVocabCorrectAnswers,
    incrementTimedVocabWrongAnswers,
    resetTimedVocabStats
  } = useStatsStore();

  const config: TimedChallengeConfig<IVocabObj> = {
    dojoType: 'vocabulary',
    dojoLabel: 'Vocabulary',
    localStorageKey: 'timedVocabChallengeDuration',
    goalTimerContext: 'Vocabulary Timed Challenge',
    items: selectedVocabObjs,
    generateQuestion: items => items[Math.floor(Math.random() * items.length)],
    renderQuestion: question => (
      <FuriganaText text={question.word} reading={question.reading} />
    ),
    getAudioText: question => question.word,
    inputPlaceholder: 'Type the meaning...',
    modeDescription: 'Mode: Input (See Japanese word → Type meaning)',
    checkAnswer: (question, answer) =>
      question.meanings.some(
        meaning => answer.toLowerCase() === meaning.toLowerCase()
      ),
    getCorrectAnswer: question => question.meanings[0],
    stats: {
      correct: timedVocabCorrectAnswers,
      wrong: timedVocabWrongAnswers,
      streak: timedVocabStreak,
      bestStreak: timedVocabBestStreak,
      incrementCorrect: incrementTimedVocabCorrectAnswers,
      incrementWrong: incrementTimedVocabWrongAnswers,
      reset: resetTimedVocabStats
    }
  };

  return <TimedChallenge config={config} />;
}
