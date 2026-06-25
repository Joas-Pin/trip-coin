#!/usr/bin/env python3
"""
NFC-e Scraper - Extrai o valor total da NF-e a partir da chave de acesso
Funciona com todos os estados brasileiros usando o Portal Nacional da NF-e
"""

import re
import sys
import argparse
import urllib.parse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Erro: Pacotes necessários não instalados!")
    print("Instale usando: pip install requests beautifulsoup4")
    sys.exit(1)


def extrair_chave_acesso(input_str):
    """
    Extrai a chave de acesso de 44 dígitos de uma URL ou string
    """
    # Primeiro, procura por 44 dígitos consecutivos
    padrao = re.compile(r'\b(\d{44})\b')
    match = padrao.search(input_str)
    if match:
        return match.group(1)
    
    # Se não encontrou, tenta extrair de parâmetros de URL
    try:
        url_parts = urllib.parse.urlparse(input_str)
        params = urllib.parse.parse_qs(url_parts.query)
        parametros = ['chNFe', 'chave', 'ch', 'nfe']
        
        for param in parametros:
            if param in params:
                valor = params[param][0]
                if len(valor) == 44 and valor.isdigit():
                    return valor
    except Exception:
        pass
    
    return None


def consultar_valor_total(chave_acesso):
    """
    Consulta o Portal Nacional da NF-e e retorna o valor total da nota
    """
    # URL do Portal Nacional da NF-e
    url_portal = "https://www.nfe.fazenda.gov.br/portal/consultaResumoNFe.aspx"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # Primeira requisição para obter cookies e tokens
        session = requests.Session()
        response = session.get(url_portal, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Encontra o formulário de consulta
        form = soup.find('form')
        if not form:
            raise Exception("Formulário de consulta não encontrado")
        
        # Prepara os dados do formulário
        form_data = {}
        for input_tag in form.find_all('input'):
            name = input_tag.get('name')
            if name:
                form_data[name] = input_tag.get('value', '')
        
        # Adiciona a chave de acesso
        # Procura o campo de chave de acesso (geralmente tem 'chave' no nome)
        campo_chave = None
        for input_tag in form.find_all('input'):
            name = input_tag.get('name', '')
            if 'chave' in name.lower() or 'nfe' in name.lower():
                campo_chave = name
                break
        
        if campo_chave:
            form_data[campo_chave] = chave_acesso
        
        # Encontra o botão de submit
        submit_button = form.find('input', {'type': 'submit'})
        if submit_button:
            form_data[submit_button.get('name')] = submit_button.get('value', '')
        
        # Envia o formulário
        action = form.get('action', url_portal)
        if not action.startswith('http'):
            action = urllib.parse.urljoin(url_portal, action)
        
        response = session.post(action, data=form_data, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Procura o valor total da NF-e usando várias estratégias
        valor_total = None
        
        # Estratégia 1: Procura por "Valor Total da NF-e" ou similar
        textos_busca = [
            'valor total', 'total da nota', 'valor da nf',
            'total da nf-e', 'valor total da nf-e'
        ]
        
        for texto in textos_busca:
            for tag in soup.find_all(['td', 'span', 'div', 'p']):
                if texto.lower() in tag.text.lower():
                    # Procura o valor próximo a essa tag
                    texto_completo = tag.text.lower()
                    # Procura por padrões de moeda
                    padroes_moeda = [
                        r'R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})',
                        r'R\$\s*(\d+,\d{2})',
                        r'(\d{1,3}(?:\.\d{3})*,\d{2})',
                        r'(\d+,\d{2})'
                    ]
                    
                    for padrao in padroes_moeda:
                        match = re.search(padrao, tag.text)
                        if match:
                            valor_str = match.group(1)
                            # Converte para float (troca , por . e remove pontos de milhar)
                            valor_str = valor_str.replace('.', '').replace(',', '.')
                            try:
                                valor_total = float(valor_str)
                                if valor_total > 0:
                                    return valor_total
                            except (ValueError, TypeError):
                                continue
        
        # Se não encontrou, retorna None
        return None
        
    except requests.exceptions.RequestException as e:
        if 'captcha' in str(e).lower():
            raise Exception("Captcha detectado! Não foi possível consultar automaticamente.")
        raise Exception(f"Erro na requisição: {str(e)}")
    except Exception as e:
        raise Exception(f"Erro ao extrair valor: {str(e)}")


def main():
    parser = argparse.ArgumentParser(
        description='Extrai o valor total de uma NFC-e a partir da chave de acesso ou URL do QR Code'
    )
    parser.add_argument(
        'input',
        help='URL do QR Code da NFC-e ou chave de acesso de 44 dígitos'
    )
    
    args = parser.parse_args()
    
    # Extrai a chave de acesso
    chave = extrair_chave_acesso(args.input)
    if not chave:
        print("Erro: Chave de acesso não encontrada (deve conter 44 dígitos)")
        sys.exit(1)
    
    print(f"Chave de acesso: {chave}")
    print("Consultando Portal Nacional da NF-e...")
    
    try:
        valor = consultar_valor_total(chave)
        if valor:
            print(f"Valor total da NF-e: R$ {valor:.2f}")
            print(valor)  # Imprime apenas o float para integração fácil
        else:
            print("Erro: Não foi possível encontrar o valor total da NF-e")
            sys.exit(1)
    except Exception as e:
        print(f"Erro: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
