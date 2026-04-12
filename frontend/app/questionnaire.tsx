import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Question {
  id: string;
  question: string;
  type: 'single' | 'multiple';
  options: string[];
}

export default function Questionnaire() {
  const router = useRouter();
  const { token, updateUser } = useAuthStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/questionnaire/questions`);
      setQuestions(response.data.questions);
      setLoading(false);
    } catch (error) {
      console.error('Error loading questions:', error);
      Alert.alert('Error', 'Failed to load questionnaire');
    }
  };

  const handleAnswer = (answer: string) => {
    const question = questions[currentIndex];
    
    if (question.type === 'single') {
      setResponses({ ...responses, [question.id]: answer });
    } else {
      const current = responses[question.id] || [];
      const newAnswers = current.includes(answer)
        ? current.filter((a: string) => a !== answer)
        : [...current, answer];
      setResponses({ ...responses, [question.id]: newAnswers });
    }
  };

  const isSelected = (option: string) => {
    const question = questions[currentIndex];
    const answer = responses[question.id];
    
    if (question.type === 'single') {
      return answer === option;
    } else {
      return answer?.includes(option) || false;
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await axios.post(
        `${BACKEND_URL}/api/questionnaire/submit`,
        { responses },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success', 'Questionnaire completed! Let\'s find your matches.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/matches') },
      ]);
    } catch (error) {
      console.error('Error submitting questionnaire:', error);
      Alert.alert('Error', 'Failed to submit questionnaire');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Get to Know You</Text>
        <Text style={styles.subtitle}>
          Question {currentIndex + 1} of {questions.length}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.question}>{question.question}</Text>
        <Text style={styles.hint}>
          {question.type === 'multiple' ? 'Select all that apply' : 'Select one'}
        </Text>

        <View style={styles.options}>
          {question.options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                isSelected(option) && styles.optionSelected,
              ]}
              onPress={() => handleAnswer(option)}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected(option) && styles.optionTextSelected,
                ]}
              >
                {option}
              </Text>
              {isSelected(option) && (
                <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Ionicons name="arrow-back" size={24} color={currentIndex === 0 ? '#555' : '#fff'} />
          <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        {isLastQuestion ? (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Complete'}
            </Text>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navButton} onPress={handleNext}>
            <Text style={styles.navButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  question: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#2a2020',
  },
  optionText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  optionTextSelected: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    gap: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2a2a2a',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#555',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});