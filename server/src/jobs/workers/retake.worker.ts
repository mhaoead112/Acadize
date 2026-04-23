import { RetakeExamGeneratorService, RetakeGeneratorOptions, TeacherConstraints } from '../../services/retake-exam-generator.service.js';
import { generateRetakeExam as generateBasicRetakeExam } from '../../services/retake.service.js';

export interface RetakeJobData {
    type: 'basic' | 'generator';
    basicOptions?: any;
    generatorOptions?: RetakeGeneratorOptions;
    generatorConstraints?: TeacherConstraints;
}

export async function handleRetakeGeneration(jobData: RetakeJobData) {
    if (jobData.type === 'basic' && jobData.basicOptions) {
        await generateBasicRetakeExam(jobData.basicOptions);
    } else if (jobData.type === 'generator' && jobData.generatorOptions) {
        await RetakeExamGeneratorService.generateRetakeExam(
            jobData.generatorOptions,
            jobData.generatorConstraints
        );
    } else {
        throw new Error('Invalid retake job data payload');
    }
}
