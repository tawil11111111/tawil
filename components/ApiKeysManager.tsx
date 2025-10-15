import React, { useState, useEffect } from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';


type Provider = 'gemini' | 'sora' | 'kling' | 'minimax' | 'deepai' | 'azure';

interface ApiKeysManagerProps {
    onSave: (provider: Provider, apiKey: string) => void;
    quotaExceededProviders: Set<Provider>;
    savedKeys: { [key in Provider]?: string | null };
}

const providerDetails: { [key in Provider]: { name: string, placeholder: string } } = {
    gemini: { name: 'Gemini (Google AI)', placeholder: 'Nhập khóa API Gemini của bạn' },
    sora: { name: 'Sora (OpenAI)', placeholder: 'Nhập khóa API OpenAI của bạn' },
    azure: { name: 'Azure (Sora)', placeholder: 'Nhập khóa API Azure OpenAI' },
    kling: { name: 'Kling', placeholder: 'Nhập khóa API Kling của bạn' },
    minimax: { name: 'Minimax', placeholder: 'Nhập khóa API Minimax của bạn' },
    deepai: { name: 'DeepAI', placeholder: 'Nhập khóa API DeepAI' },
}

export const ApiKeysManager: React.FC<ApiKeysManagerProps> = ({ onSave, quotaExceededProviders, savedKeys }) => {
    const [activeTab, setActiveTab] = useState<Provider>('gemini');
    const [apiKeysInput, setApiKeysInput] = useState<{ [key in Provider]: string }>({
        gemini: '',
        sora: '',
        kling: '',
        minimax: '',
        deepai: '',
        azure: '',
    });
    const [isEditing, setIsEditing] = useState<{ [key in Provider]: boolean }>({
        gemini: !savedKeys.gemini,
        sora: !savedKeys.sora,
        kling: !savedKeys.kling,
        minimax: !savedKeys.minimax,
        deepai: !savedKeys.deepai,
        azure: !savedKeys.azure,
    });
    const [isKeyVisible, setIsKeyVisible] = useState<{ [key in Provider]?: boolean }>({});


    useEffect(() => {
        setIsEditing(prev => ({
            gemini: !savedKeys.gemini,
            sora: !savedKeys.sora,
            kling: !savedKeys.kling,
            minimax: !savedKeys.minimax,
            deepai: !savedKeys.deepai,
            azure: !savedKeys.azure,
        }));
    }, [savedKeys]);
    
    const handleSave = (provider: Provider) => {
        const keyToSave = apiKeysInput[provider].trim();
        if (keyToSave) {
            onSave(provider, keyToSave);
            setIsEditing(prev => ({...prev, [provider]: false}));
            setApiKeysInput(prev => ({...prev, [provider]: ''}));
        }
    };

    const handleEdit = (provider: Provider) => {
        setIsEditing(prev => ({...prev, [provider]: true}));
    };
    
    const handleCancel = (provider: Provider) => {
        setIsEditing(prev => ({...prev, [provider]: false}));
        setApiKeysInput(prev => ({...prev, [provider]: ''}));
    };

    const toggleKeyVisibility = (provider: Provider) => {
        setIsKeyVisible(prev => ({ ...prev, [provider]: !prev[provider] }));
    };

    const renderTabContent = (provider: Provider) => {
        const details = providerDetails[provider];
        const storedKey = savedKeys[provider];
        const displayKey = storedKey ? `${storedKey.substring(0, 4)}...${storedKey.substring(storedKey.length - 4)}` : 'Chưa có khóa API';
        const isQuotaExceeded = quotaExceededProviders.has(provider);

        if (!isEditing[provider] && storedKey) {
            return (
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <KeyIcon className="text-cyan-300" />
                        <div>
                            <p className="text-purple-300 font-semibold">Khóa API đã lưu</p>
                            <p className="text-gray-400 text-sm font-mono">{displayKey}</p>
                        </div>
                    </div>
                    <button onClick={() => handleEdit(provider)} className="text-cyan-300 hover:text-cyan-100 text-sm font-semibold">
                        Chỉnh sửa
                    </button>
                </div>
            );
        }

        return (
            <div>
                 {isQuotaExceeded && (
                    <p className="text-red-400 text-sm mb-3">Hạn ngạch API đã hết. Vui lòng tạo và nhập một khóa API mới để tiếp tục.</p>
                )}
                {!storedKey && !isQuotaExceeded && (
                     <p className="text-yellow-400 text-sm mb-3">Vui lòng nhập khóa API {details.name} của bạn để bắt đầu.</p>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                         <input
                            type={isKeyVisible[provider] ? 'text' : 'password'}
                            value={apiKeysInput[provider]}
                            onChange={(e) => setApiKeysInput(prev => ({...prev, [provider]: e.target.value}))}
                            placeholder={details.placeholder}
                            className="w-full bg-gray-900/70 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition pr-10"
                        />
                        <button
                            onClick={() => toggleKeyVisibility(provider)}
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-cyan-300"
                            aria-label="Toggle key visibility"
                        >
                            {isKeyVisible[provider] ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    <button
                        onClick={() => handleSave(provider)}
                        className="bg-cyan-500 text-black font-bold py-2 px-4 rounded-lg border-2 border-cyan-500 transition-all duration-300 hover:bg-cyan-400 rgb-glow-button"
                    >
                        Lưu khóa
                    </button>
                    {storedKey && (
                         <button
                            onClick={() => handleCancel(provider)}
                            className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg border-2 border-gray-600 transition-all duration-300 hover:bg-gray-500"
                        >
                            Hủy
                        </button>
                    )}
                </div>
                <p className="text-xs text-gray-400 mt-2">Khóa của bạn được lưu cục bộ trong trình duyệt của bạn.</p>
            </div>
        );
    }

    return (
        <div className={`bg-gray-800/80 backdrop-blur-md rounded-xl border border-purple-500/50 rgb-glow mb-8`}>
            <div className="flex border-b border-purple-500/50 overflow-x-auto">
                {(Object.keys(providerDetails) as Provider[]).map(provider => (
                     <button
                        key={provider}
                        onClick={() => setActiveTab(provider)}
                        className={`py-2 px-4 text-sm font-semibold transition-colors duration-300 whitespace-nowrap ${activeTab === provider ? 'bg-purple-600/50 text-cyan-300' : 'text-purple-300 hover:bg-purple-600/20'}`}
                     >
                        {providerDetails[provider].name}
                     </button>
                ))}
            </div>
            <div className="p-4">
                {renderTabContent(activeTab)}
            </div>
        </div>
    );
};